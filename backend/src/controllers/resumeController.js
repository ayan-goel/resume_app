const { Resume, Company, Keyword, User, sequelize } = require('../models');
const { uploadFile, deleteFile, s3Client } = require('../utils/s3');
const { parseResume } = require('../utils/resumeParser');
const { Op } = require('sequelize');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Format text in title case (first letter of each word capitalized, rest lowercase)
 * @param {string} text - The text to format
 * @returns {string} - Properly formatted text
 */
const formatTitleCase = (text) => {
  if (!text) return '';
  
  // Handle special cases for company abbreviations
  const commonAbbreviations = ['LLC', 'LLP', 'Inc', 'Corp', 'Ltd', 'Co', 'USA', 'US', 'UK', 'AI', 'IT', 'IBM', 'HP', 'AWS', 'GE'];
  const commonLowercase = ['of', 'the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'to'];
  
  // Split by spaces and format each word
  return text.split(' ')
    .map((word, index) => {
      // Check if the word is a common abbreviation (case sensitive)
      if (commonAbbreviations.includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      
      // For articles, prepositions, and conjunctions, keep lowercase unless it's the first word
      if (index > 0 && commonLowercase.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // Default formatting: first letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Helper function to find or create companies
const findOrCreateCompanies = async (companyNames) => {
  if (!companyNames || !companyNames.length) return [];
  
  const companies = [];
  for (const name of companyNames) {
    // Format company name in title case
    const formattedName = formatTitleCase(name.trim());
    
    const [company] = await Company.findOrCreate({
      where: { name: formattedName }
    });
    companies.push(company);
  }
  return companies;
};

// Helper function to find or create keywords
const findOrCreateKeywords = async (keywordNames) => {
  if (!keywordNames || !keywordNames.length) return [];
  
  const keywords = [];
  for (const name of keywordNames) {
    const [keyword] = await Keyword.findOrCreate({
      where: { name: name.trim() }
    });
    keywords.push(keyword);
  }
  return keywords;
};

// Upload a new resume
const uploadResume = async (req, res) => {
  let transaction;
  let s3Key = null;
  let currentStep = 'initialization';
  
  try {
    // Log request details for debugging
    console.log(`Starting resume upload: ${req.file?.originalname || 'Unnamed file'}, size: ${req.file?.size || 'unknown'} bytes`);
    
    currentStep = 'transaction_begin';
    transaction = await sequelize.transaction();
    
    currentStep = 'validation';
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No PDF file uploaded.' });
    }

    // Check if file buffer is valid
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: true, message: 'Empty file content.' });
    }
    
    // Check if file is too large (>10MB)
    if (req.file.buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: true, message: 'File too large. Maximum file size is 10MB.' });
    }
    
    // Check PDF header - most PDFs start with %PDF
    const header = req.file.buffer.slice(0, 4).toString();
    if (header !== '%PDF') {
      return res.status(400).json({ error: true, message: 'Invalid PDF file format.' });
    }

    // Parse the resume to extract information
    console.log(`Parsing resume: ${req.file.originalname || 'Unnamed file'}, size: ${req.file.buffer.length} bytes`);
    currentStep = 'resume_parsing';
    
    // Extract the filename without extension as a fallback name
    const filenameWithoutExt = req.file.originalname
      ? req.file.originalname.replace(/\.[^/.]+$/, "") // Remove file extension
      : `Resume_${Date.now()}`;
    
    let parsedData;
    try {
      // Parse the resume (filename used as fallback)
      parsedData = await parseResume(req.file.buffer, filenameWithoutExt);
    } catch (parseError) {
      console.error('Error in resume parsing, using fallback data:', parseError);
      parsedData = {
        name: filenameWithoutExt,
        major: 'Unspecified',
        graduationYear: 'Unspecified',
        companies: [],
        keywords: []
      };
    }
    
    currentStep = 'data_processing';
    
    // Get name from form or extract from PDF filename
    let name = req.body.name;
    
    // If name is not provided in the form, use the parsed name or filename
    if (!name) {
      // First, check if we have a name in the parsed data
      if (parsedData.name) {
        name = parsedData.name;
      } else {
        // Use filename as last resort
        name = filenameWithoutExt;
      }
    }
    
    // Ensure name is not empty and properly formatted
    if (!name || name.trim() === '') {
      name = 'Unknown Resume ' + Date.now();
    }
    
    // Truncate name if it's too long for the database
    if (name.length > 255) {
      name = name.substring(0, 252) + '...';
    }
    
    // Get data from parsed resume or form inputs (fallback)
    let major = req.body.major || parsedData.major || '';
    let graduationYear = req.body.graduationYear || parsedData.graduationYear || '';
    
    // Validate major - don't allow empty values
    if (!major || major.trim() === '') {
      major = 'Unspecified';
    }
    
    // Truncate major if it's too long
    if (major.length > 255) {
      major = major.substring(0, 252) + '...';
    }
    
    // If graduation year is invalid, use a placeholder
    if (!graduationYear || graduationYear.trim() === '') {
      graduationYear = 'Unspecified';
    }
    
    // Truncate graduation year if needed
    if (graduationYear.length > 255) {
      graduationYear = 'Unspecified';
    }
    
    // Get companies and keywords from parsed data (if not provided)
    let companyList = req.body.companies
      ? req.body.companies.split(',').map(c => c.trim()).filter(Boolean)
      : parsedData.companies || [];
      
    let keywordList = req.body.keywords
      ? req.body.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : parsedData.keywords || [];
    
    // Ensure company and keyword lists don't exceed reasonable limits
    if (companyList.length > 100) {
      console.warn(`Truncating company list from ${companyList.length} to 100 items`);
      companyList = companyList.slice(0, 100);
    }
    
    if (keywordList.length > 100) {
      console.warn(`Truncating keyword list from ${keywordList.length} to 100 items`);
      keywordList = keywordList.slice(0, 100);
    }

    // Generate S3 key for the file
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100);
    s3Key = `resumes/${sanitizedName}_${timestamp}.pdf`;
    
    // Upload file to S3 with proper error handling
    currentStep = 's3_upload';
    let pdfUrl;
    try {
      console.log(`Uploading file to S3: ${s3Key}`);
      pdfUrl = await uploadFile(
        req.file.buffer,
        s3Key,
        'application/pdf'
      );
      console.log(`S3 upload successful: ${pdfUrl}`);
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      // If the S3 upload fails, we still want to create the record
      // but with a placeholder URL
      pdfUrl = `failed-upload-${timestamp}`;
      s3Key = null; // Clear S3 key so we don't try to delete a non-existent file later
    }
    
    // Create resume record
    currentStep = 'database_create';
    console.log(`Creating database record for: ${name}`);
    
    let resume;
    try {
      resume = await Resume.create({
        name,
        major,
        graduationYear,
        pdfUrl,
        s3Key: s3Key || `failed-upload-${timestamp}`, // Store something even if S3 failed
        uploadedBy: req.user.id
      }, { transaction });
    } catch (dbError) {
      console.error('Database create error:', dbError);
      throw new Error(`Database create failed: ${dbError.message}`);
    }
    
    // Find or create companies and associate with resume
    currentStep = 'associate_companies';
    try {
      console.log(`Associating ${companyList.length} companies with resume`);
      const companyObjects = await findOrCreateCompanies(companyList);
      await resume.setCompanies(companyObjects, { transaction });
    } catch (companyError) {
      console.error('Error associating companies:', companyError);
      // Continue with the upload even if company association fails
    }
    
    // Find or create keywords and associate with resume
    currentStep = 'associate_keywords';
    try {
      console.log(`Associating ${keywordList.length} keywords with resume`);
      const keywordObjects = await findOrCreateKeywords(keywordList);
      await resume.setKeywords(keywordObjects, { transaction });
    } catch (keywordError) {
      console.error('Error associating keywords:', keywordError);
      // Continue with the upload even if keyword association fails
    }
    
    // Commit transaction
    currentStep = 'transaction_commit';
    console.log(`Committing transaction`);
    await transaction.commit();
    transaction = null; // Clear transaction since it's committed
    
    console.log(`Resume upload complete: ${name}`);
    res.status(201).json({
      error: false,
      message: 'Resume uploaded successfully.',
      data: {
        id: resume.id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        pdfUrl: resume.pdfUrl,
        companies: [], // Just return empty arrays since we might not have these after errors
        keywords: []
      }
    });
  } catch (error) {
    // Roll back transaction if it exists and hasn't been committed
    if (transaction) {
      try {
        console.log(`Rolling back transaction due to error in step: ${currentStep}`);
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    // If we created an S3 file but the database operation failed, try to clean up the S3 file
    if (s3Key) {
      try {
        console.log(`Cleaning up S3 file after error: ${s3Key}`);
        await deleteFile(s3Key);
      } catch (deleteError) {
        console.error('Error cleaning up S3 file after failed upload:', deleteError);
      }
    }
    
    console.error(`Resume upload error in step ${currentStep}:`, error);
    console.error('Error details:', JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    }, null, 2));
    
    // Provide more specific error messages based on the error type
    let errorMessage = `Error uploading resume (${currentStep}): ${error.message}`;
    if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Invalid resume data: ' + error.message;
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = 'A resume with this information already exists.';
    } else if (error.message && error.message.includes('S3')) {
      errorMessage = 'Error storing resume file: ' + error.message;
    }
    
    res.status(500).json({ error: true, message: errorMessage });
  }
};

// Search resumes with filtering
const searchResumes = async (req, res) => {
  try {
    const { query, name, major, company, graduationYear, keyword } = req.query;
    
    // Base where clause for Resume model
    const resumeWhere = { isActive: true };
    
    // Include clauses for associated models
    const companyInclude = {
      model: Company,
      as: 'companies',
      through: { attributes: [] },
      required: false // Default to false, might become true if filtered
    };
    const keywordInclude = {
      model: Keyword,
      as: 'keywords',
      through: { attributes: [] },
      required: false // Default to false, might become true if filtered
    };
    
    // Array for OR conditions from the general query
    const generalQueryOrConditions = [];
    if (query) {
      const searchQuery = { [Op.iLike]: `%${query}%` };
      generalQueryOrConditions.push(
        { name: searchQuery },
        { major: searchQuery },
        { graduationYear: searchQuery },
        // Use Sequelize's syntax for querying associated models
        { '$companies.name$': searchQuery },
        { '$keywords.name$': searchQuery }
      );
    }
    
    // --- Specific Filters --- 
    // Specific name filter
    if (name) {
      resumeWhere.name = { [Op.iLike]: `%${name}%` };
    }
    
    // Specific major filter
    if (major) {
      const majorList = major.split(',').map(m => m.trim()).filter(Boolean);
      if (majorList.length > 0) resumeWhere.major = { [Op.in]: majorList };
    }
    
    // Specific graduation year filter
    if (graduationYear) {
      const yearList = graduationYear.split(',').map(y => y.trim()).filter(Boolean);
      if (yearList.length > 0) resumeWhere.graduationYear = { [Op.in]: yearList };
    }
    
    // Specific company filter
    if (company) {
      const companyList = company.split(',').map(c => c.trim()).filter(Boolean);
      if (companyList.length > 0) {
        companyInclude.where = { name: { [Op.in]: companyList } };
        companyInclude.required = true; // If filtering by company, it must exist
      }
    }
    
    // Specific keyword filter
    if (keyword) {
      const keywordList = keyword.split(',').map(k => k.trim()).filter(Boolean);
      if (keywordList.length > 0) {
        keywordInclude.where = { name: { [Op.in]: keywordList } };
        keywordInclude.required = true; // If filtering by keyword, it must exist
      }
    }
    
    // Combine general query OR conditions with other AND conditions
    if (generalQueryOrConditions.length > 0) {
      // If there are other conditions in resumeWhere, combine with AND
      // Otherwise, just use the OR conditions
      if (Object.keys(resumeWhere).length > 1) { // More than just isActive: true
        resumeWhere[Op.and] = [
          { [Op.or]: generalQueryOrConditions },
          // Include other existing resumeWhere conditions (excluding Op.and/Op.or if they exist)
          Object.fromEntries(Object.entries(resumeWhere).filter(([key]) => key !== Op.and && key !== Op.or))
        ];
        // Remove the original keys that are now inside the Op.and
        Object.keys(resumeWhere).forEach(key => {
          if (key !== Op.and && key !== 'isActive') delete resumeWhere[key]; 
        });
      } else {
        // Only isActive and the general query OR conditions
        resumeWhere[Op.or] = generalQueryOrConditions;
      }
    }
    
    // Final include array
    const finalInclude = [companyInclude, keywordInclude];
    
    console.log('Final Search Query:', JSON.stringify({ where: resumeWhere, include: finalInclude }, null, 2));
    
    // Query the database
    const resumes = await Resume.findAll({
      where: resumeWhere,
      include: finalInclude,
      order: [['createdAt', 'DESC']],
      // Required when filtering on associated models in the main where clause
      subQuery: false, 
      // Required with subQuery:false and includes to avoid duplicates
      distinct: true, 
      col: 'id' // Specify the column for DISTINCT count (primary key)
    });
    
    // Generate signed URLs and format the response
    const formattedResumes = await Promise.all(resumes.map(async (resume) => {
      let signedPdfUrl = null;
      // Need to check if companies/keywords exist on the fetched resume object
      // as includes might not bring them if they didn't match specific filters
      const associatedCompanies = resume.companies ? resume.companies.map(c => c.name) : [];
      const associatedKeywords = resume.keywords ? resume.keywords.map(k => k.name) : [];

      if (resume.s3Key) { // Only generate if s3Key exists
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME, // Ensure bucket name is in env
            Key: resume.s3Key,
          });
          // Generate signed URL valid for 15 minutes (adjust as needed)
          signedPdfUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }); 
        } catch (urlError) {
          console.error(`Error generating signed URL for key ${resume.s3Key}:`, urlError);
          // Keep signedPdfUrl as null if generation fails
        }
      }

      return {
        id: resume.id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        pdfUrl: resume.pdfUrl, // Keep original URL if needed for other purposes
        signedPdfUrl: signedPdfUrl, // Add the signed URL
        s3Key: resume.s3Key, // Include s3Key for potential debugging
        companies: associatedCompanies,
        keywords: associatedKeywords
      };
    }));
    
    res.status(200).json({
      error: false,
      count: formattedResumes.length,
      data: formattedResumes
    });
  } catch (error) {
    console.error('Resume search error:', error);
    // Check for specific Sequelize errors if helpful
    if (error instanceof sequelize.Error) {
      console.error('Sequelize Error Details:', error.message);
    }
    res.status(500).json({ error: true, message: 'Error searching resumes.' });
  }
};

// Get resume by ID
const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const resume = await Resume.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: Company,
          as: 'companies',
          through: { attributes: [] }
        },
        {
          model: Keyword,
          as: 'keywords',
          through: { attributes: [] }
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!resume) {
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }
    
    // Format the response
    const formattedResume = {
      id: resume.id,
      name: resume.name,
      major: resume.major,
      graduationYear: resume.graduationYear,
      pdfUrl: resume.pdfUrl,
      companies: resume.companies.map(c => c.name),
      keywords: resume.keywords.map(k => k.name),
      uploader: resume.uploader ? {
        id: resume.uploader.id,
        name: `${resume.uploader.firstName} ${resume.uploader.lastName}`,
        email: resume.uploader.email
      } : null,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    };
    
    res.status(200).json({
      error: false,
      data: formattedResume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: true, message: 'Error retrieving resume.' });
  }
};

// Update resume
const updateResume = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { name, major, graduationYear, companies, keywords } = req.body;
    
    // Find the resume
    const resume = await Resume.findOne({
      where: { id, isActive: true },
      include: [
        { model: Company, as: 'companies' },
        { model: Keyword, as: 'keywords' }
      ]
    });
    
    if (!resume) {
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }
    
    // Check if the user has permission to update this resume
    if (req.user.role !== 'admin' && resume.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: true, message: 'Permission denied.' });
    }
    
    // Update resume fields
    if (name) resume.name = name;
    if (major) resume.major = major;
    if (graduationYear) resume.graduationYear = graduationYear;
    
    await resume.save({ transaction });
    
    // Update companies if provided
    if (companies) {
      const companyList = companies.split(',').map(c => c.trim()).filter(Boolean);
      const companyObjects = await findOrCreateCompanies(companyList);
      await resume.setCompanies(companyObjects, { transaction });
    }
    
    // Update keywords if provided
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const keywordObjects = await findOrCreateKeywords(keywordList);
      await resume.setKeywords(keywordObjects, { transaction });
    }
    
    // Refresh resume with updated associations
    await resume.reload({
      include: [
        { model: Company, as: 'companies' },
        { model: Keyword, as: 'keywords' }
      ],
      transaction
    });
    
    // Commit transaction
    await transaction.commit();
    
    // Format the response
    const formattedResume = {
      id: resume.id,
      name: resume.name,
      major: resume.major,
      graduationYear: resume.graduationYear,
      pdfUrl: resume.pdfUrl,
      companies: resume.companies.map(c => c.name),
      keywords: resume.keywords.map(k => k.name)
    };
    
    res.status(200).json({
      error: false,
      message: 'Resume updated successfully.',
      data: formattedResume
    });
  } catch (error) {
    // Roll back transaction on error
    await transaction.rollback();
    
    console.error('Resume update error:', error);
    res.status(500).json({ error: true, message: 'Error updating resume.' });
  }
};

// Delete resume
const deleteResume = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find the resume
    const resume = await Resume.findOne({
      where: { id, isActive: true }
    });
    
    if (!resume) {
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }
    
    // Check if the user has permission to delete this resume
    if (req.user.role !== 'admin' && resume.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: true, message: 'Permission denied.' });
    }
    
    // Soft delete the resume
    resume.isActive = false;
    await resume.save({ transaction });
    
    // Delete the file from S3
    await deleteFile(resume.s3Key);
    
    // Commit transaction
    await transaction.commit();
    
    res.status(200).json({
      error: false,
      message: 'Resume deleted successfully.'
    });
  } catch (error) {
    // Roll back transaction on error
    await transaction.rollback();
    
    console.error('Resume delete error:', error);
    res.status(500).json({ error: true, message: 'Error deleting resume.' });
  }
};

// Delete all resumes (admin only)
const deleteAllResumes = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Ensure the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: true, message: 'Permission denied. Admin access required.' });
    }
    
    // Get all active resumes to delete their S3 files
    const allResumes = await Resume.findAll({
      where: { isActive: true },
      attributes: ['id', 's3Key'],
      transaction
    });
    
    if (allResumes.length === 0) {
      return res.status(404).json({ error: true, message: 'No active resumes found to delete.' });
    }
    
    // Soft delete all resumes
    await Resume.update(
      { isActive: false },
      { where: { isActive: true }, transaction }
    );
    
    // Delete all files from S3
    const deletePromises = allResumes.map(resume => {
      if (resume.s3Key) {
        return deleteFile(resume.s3Key).catch(err => {
          console.error(`Error deleting S3 file ${resume.s3Key}:`, err);
          // Continue with other deletions even if one fails
          return Promise.resolve();
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(deletePromises);
    
    // Commit transaction
    await transaction.commit();
    
    res.status(200).json({
      error: false,
      message: `Successfully deleted ${allResumes.length} resumes.`
    });
  } catch (error) {
    // Roll back transaction on error
    await transaction.rollback();
    
    console.error('Delete all resumes error:', error);
    res.status(500).json({ error: true, message: 'Error deleting all resumes.' });
  }
};

// Get available filters (majors, companies, graduation years)
const getFilters = async (req, res) => {
  try {
    // Get unique majors
    const majors = await Resume.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('major')), 'major']],
      where: { 
        isActive: true,
        major: {
          [Op.not]: ''
        }
      },
      raw: true
    });
    
    // Get unique graduation years
    const graduationYears = await Resume.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('graduationYear')), 'graduationYear']],
      where: { 
        isActive: true,
        graduationYear: {
          [Op.not]: ''
        }
      },
      raw: true
    });
    
    // Get all companies
    const companies = await Company.findAll({
      attributes: ['name'],
      include: [{
        model: Resume,
        as: 'resumes',
        where: { isActive: true },
        attributes: []
      }],
      raw: true
    });
    
    // Get all keywords
    const keywords = await Keyword.findAll({
      attributes: ['name'],
      include: [{
        model: Resume,
        as: 'resumes',
        where: { isActive: true },
        attributes: []
      }],
      raw: true
    });
    
    // Format the response and filter out empty values
    const filters = {
      majors: majors.map(m => m.major).filter(Boolean),
      graduationYears: graduationYears.map(y => y.graduationYear).filter(Boolean),
      companies: companies.map(c => c.name).filter(Boolean),
      keywords: keywords.map(k => k.name).filter(Boolean)
    };
    
    res.status(200).json({
      error: false,
      data: filters
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: true, message: 'Error retrieving filters.' });
  }
};

module.exports = {
  uploadResume,
  searchResumes,
  getResumeById,
  updateResume,
  deleteResume,
  deleteAllResumes,
  getFilters
}; 