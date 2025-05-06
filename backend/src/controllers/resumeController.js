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
  const originalFilename = req.file?.originalname || 'Unnamed file';

  try {
    // Log request details for debugging
    console.log(`[${originalFilename}] Starting resume upload. Size: ${req.file?.size || 'unknown'} bytes`);

    currentStep = 'transaction_begin';
    transaction = await sequelize.transaction();
    console.log(`[${originalFilename}] Transaction started.`);

    currentStep = 'validation';
    if (!req.file) {
      console.error(`[${originalFilename}] Validation failed: No PDF file uploaded.`);
      // No transaction to rollback here, just return error
      return res.status(400).json({ error: true, message: 'No PDF file uploaded.' });
    }

    // Check if file buffer is valid
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error(`[${originalFilename}] Validation failed: Empty file content.`);
      await transaction.rollback(); // Rollback transaction
      return res.status(400).json({ error: true, message: 'Empty file content.' });
    }

    // Check if file is too large (>10MB)
    if (req.file.buffer.length > 10 * 1024 * 1024) {
       console.error(`[${originalFilename}] Validation failed: File too large (${req.file.buffer.length} bytes).`);
       await transaction.rollback(); // Rollback transaction
      return res.status(400).json({ error: true, message: 'File too large. Maximum file size is 10MB.' });
    }

    // Check PDF header - most PDFs start with %PDF
    const header = req.file.buffer.slice(0, 4).toString();
    if (header !== '%PDF') {
      console.error(`[${originalFilename}] Validation failed: Invalid PDF header "${header}".`);
      await transaction.rollback(); // Rollback transaction
      return res.status(400).json({ error: true, message: 'Invalid PDF file format.' });
    }
    console.log(`[${originalFilename}] Validation successful.`);

    // Parse the resume to extract information
    console.log(`[${originalFilename}] Parsing resume...`);
    currentStep = 'resume_parsing';

    // Extract the filename without extension as a fallback name
    const filenameWithoutExt = req.file.originalname
      ? req.file.originalname.replace(/\.[^/.]+$/, "") // Remove file extension
      : `Resume_${Date.now()}`;

    let parsedData;
    let parsingErrorMessage = null;
    try {
      // Parse the resume (filename used as fallback)
      parsedData = await parseResume(req.file.buffer, filenameWithoutExt);
      console.log(`[${originalFilename}] Parsing successful. Extracted name: ${parsedData?.name}`);
    } catch (parseError) {
      parsingErrorMessage = parseError.message || "Unknown parsing error";
      console.error(`[${originalFilename}] Error during resume parsing: ${parsingErrorMessage}. Using fallback data.`, parseError);
      // Use fallback data structure
      parsedData = {
        name: filenameWithoutExt, // Use filename as fallback name
        major: 'Unspecified',
        graduationYear: 'Unspecified',
        companies: [],
        keywords: []
      };
    }

    currentStep = 'data_processing';
    console.log(`[${originalFilename}] Processing extracted/fallback data...`);

    // Get name from form or extract from PDF filename
    let name = req.body.name;

    // If name is not provided in the form, use the parsed name or filename
    if (!name) {
      // First, check if we have a name in the parsed data
      if (parsedData.name && parsedData.name.trim() !== '') {
        name = parsedData.name;
         console.log(`[${originalFilename}] Using parsed name: ${name}`);
      } else {
        // Use filename as last resort
        name = filenameWithoutExt;
         console.log(`[${originalFilename}] Using filename as fallback name: ${name}`);
      }
    } else {
       console.log(`[${originalFilename}] Using provided name from form: ${name}`);
    }

    // Ensure name is not empty and properly formatted
    if (!name || name.trim() === '') {
      name = `Unknown_Resume_${Date.now()}`;
      console.warn(`[${originalFilename}] Name was empty, defaulted to: ${name}`);
    }

    // Truncate name if it's too long for the database
    if (name.length > 255) {
       console.warn(`[${originalFilename}] Name too long (${name.length} chars), truncating.`);
      name = name.substring(0, 252) + '...';
    }

    // Get data from parsed resume or form inputs (fallback)
    let major = req.body.major || parsedData.major || '';
    let graduationYear = req.body.graduationYear || parsedData.graduationYear || '';

    // Validate major - don't allow empty values
    if (!major || major.trim() === '') {
       console.warn(`[${originalFilename}] Major was empty, defaulting to 'Unspecified'. Parsed value was: "${parsedData.major}"`);
      major = 'Unspecified';
    }

    // Truncate major if it's too long
    if (major.length > 255) {
      console.warn(`[${originalFilename}] Major too long (${major.length} chars), truncating.`);
      major = major.substring(0, 252) + '...';
    }

    // If graduation year is invalid, use a placeholder
    if (!graduationYear || graduationYear.trim() === '') {
       console.warn(`[${originalFilename}] Graduation year was empty, defaulting to 'Unspecified'. Parsed value was: "${parsedData.graduationYear}"`);
      graduationYear = 'Unspecified';
    }

    // Truncate graduation year if needed
    if (graduationYear.length > 255) {
      console.warn(`[${originalFilename}] Graduation year too long (${graduationYear.length} chars), defaulting to 'Unspecified'.`);
      graduationYear = 'Unspecified'; // Default instead of truncating potentially meaningless year
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
      console.warn(`[${originalFilename}] Truncating company list from ${companyList.length} to 100 items`);
      companyList = companyList.slice(0, 100);
    }

    if (keywordList.length > 100) {
      console.warn(`[${originalFilename}] Truncating keyword list from ${keywordList.length} to 100 items`);
      keywordList = keywordList.slice(0, 100);
    }

    // --- Deduplicate Company and Keyword Lists --- 
    const uniqueCompanyList = [...new Set(companyList)];
    const uniqueKeywordList = [...new Set(keywordList)];

    console.log(`[${originalFilename}] Data processed. Name: "${name}", Major: "${major}", GradYear: "${graduationYear}", Unique Companies: ${uniqueCompanyList.length}, Unique Keywords: ${uniqueKeywordList.length}`);

    // Generate S3 key for the file
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100); // Ensure sanitization doesn't create empty string
    const safeSanitizedName = sanitizedName || `resume_${timestamp}`; // Fallback if name sanitization results in empty
    s3Key = `resumes/${safeSanitizedName}_${timestamp}.pdf`;

    // Upload file to S3 with proper error handling
    currentStep = 's3_upload';
    let pdfUrl;
    try {
      console.log(`[${originalFilename}] Uploading file to S3 as: ${s3Key}`);
      pdfUrl = await uploadFile(
        req.file.buffer,
        s3Key,
        'application/pdf'
      );
      console.log(`[${originalFilename}] S3 upload successful: ${pdfUrl}`);
    } catch (s3Error) {
      // Critical failure: S3 upload failed. We cannot proceed without the file URL.
      console.error(`[${originalFilename}] CRITICAL S3 upload error for key ${s3Key}:`, s3Error);
      // Throw the error to be caught by the main catch block, triggering rollback
      throw new Error(`S3 upload failed: ${s3Error.message}`);
    }

    // Create resume record
    currentStep = 'database_create';
    console.log(`[${originalFilename}] Creating database record...`);

    let resume;
    try {
      resume = await Resume.create({
        name,
        major,
        graduationYear,
        pdfUrl, // Use the confirmed S3 URL
        s3Key,   // Use the confirmed S3 key
        uploadedBy: req.user.id
      }, { transaction });
      console.log(`[${originalFilename}] Database record created successfully. ID: ${resume.id}`);
    } catch (dbError) {
      console.error(`[${originalFilename}] Database create error:`, dbError);
      // Add more specific logging for validation errors
      if (dbError.name === 'SequelizeValidationError') {
        console.error(`[${originalFilename}] Validation Errors:`, JSON.stringify(dbError.errors, null, 2));
      }
      // Throw error to be caught by main catch block -> triggers rollback & S3 cleanup
      throw new Error(`Database create failed: ${dbError.message}`);
    }

    // Find or create companies and associate with resume
    currentStep = 'associate_companies';
    try {
      if (uniqueCompanyList.length > 0) { // Use unique list
        console.log(`[${originalFilename}] Associating ${uniqueCompanyList.length} unique companies...`);
        const companyObjects = await findOrCreateCompanies(uniqueCompanyList); // Use unique list
        await resume.setCompanies(companyObjects, { transaction });
        console.log(`[${originalFilename}] Companies associated successfully.`);
      } else {
        console.log(`[${originalFilename}] No companies to associate.`);
      }
    } catch (companyError) {
      // Log the error but don't necessarily fail the entire upload
      console.error(`[${originalFilename}] Error associating companies: ${companyError.message}. Continuing transaction.`, companyError);
      // Optionally, you could decide to throw here if company association is critical
    }

    // Find or create keywords and associate with resume
    currentStep = 'associate_keywords';
    try {
      if (uniqueKeywordList.length > 0) { // Use unique list
        console.log(`[${originalFilename}] Associating ${uniqueKeywordList.length} unique keywords...`);
        const keywordObjects = await findOrCreateKeywords(uniqueKeywordList); // Use unique list
        await resume.setKeywords(keywordObjects, { transaction });
        console.log(`[${originalFilename}] Keywords associated successfully.`);
      } else {
         console.log(`[${originalFilename}] No keywords to associate.`);
      }
    } catch (keywordError) {
      // Log the error but don't necessarily fail the entire upload
      console.error(`[${originalFilename}] Error associating keywords: ${keywordError.message}. Continuing transaction.`, keywordError);
      // Optionally, you could decide to throw here if keyword association is critical
    }

    // Commit transaction
    currentStep = 'transaction_commit';
    console.log(`[${originalFilename}] Committing transaction...`);
    await transaction.commit();
    transaction = null; // Clear transaction since it's committed
    console.log(`[${originalFilename}] Transaction committed. Upload complete.`);

    res.status(201).json({
      error: false,
      message: `Resume "${originalFilename}" uploaded successfully.`,
      data: {
        id: resume.id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        pdfUrl: resume.pdfUrl,
        // Include parsing error message if one occurred, even on success
        parsingWarning: parsingErrorMessage,
        companies: uniqueCompanyList, // Return the unique lists used
        keywords: uniqueKeywordList
      }
    });
  } catch (error) {
    console.error(`[${originalFilename}] Upload failed at step: ${currentStep}. Error: ${error.message}`);

    // Roll back transaction if it exists and hasn't been committed
    if (transaction) {
      try {
        console.log(`[${originalFilename}] Rolling back transaction due to error...`);
        await transaction.rollback();
         console.log(`[${originalFilename}] Transaction rolled back successfully.`);
      } catch (rollbackError) {
        console.error(`[${originalFilename}] CRITICAL: Error rolling back transaction:`, rollbackError);
      }
    } else {
       console.log(`[${originalFilename}] No active transaction to roll back (error occurred before or after transaction).`);
    }

    // If we created an S3 file but the database operation failed AFTER S3 upload, try to clean up the S3 file
    // Only attempt delete if s3Key is set AND the error occurred AFTER s3_upload step
    const errorAfterS3 = ['database_create', 'associate_companies', 'associate_keywords', 'transaction_commit'].includes(currentStep);
    if (s3Key && errorAfterS3) {
      try {
        console.log(`[${originalFilename}] Cleaning up S3 file (${s3Key}) after error...`);
        await deleteFile(s3Key);
        console.log(`[${originalFilename}] S3 file cleanup successful.`);
      } catch (deleteError) {
        // Log this error but don't overwrite the original error response
        console.error(`[${originalFilename}] Error cleaning up S3 file (${s3Key}) after failed upload:`, deleteError);
      }
    } else if (s3Key) {
       console.log(`[${originalFilename}] S3 cleanup skipped. Error occurred at or before S3 upload step (${currentStep}).`);
    }

    // Log the detailed error
    console.error(`[${originalFilename}] Full error details:`, JSON.stringify({
      name: error.name,
      message: error.message,
      step: currentStep,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace length
      code: error.code
    }, null, 2));

    // Provide more specific error messages based on the error type and step
    let userMessage = `Error uploading resume "${originalFilename}" during step: ${currentStep}.`;
    if (currentStep === 'resume_parsing') {
      userMessage = `Failed to parse resume content for "${originalFilename}". Please check if the PDF is valid and not password-protected.`;
    } else if (error.name === 'SequelizeValidationError' || (currentStep === 'database_create' && error.message.includes('null'))) {
      userMessage = `Failed to save resume "${originalFilename}" due to missing required data (e.g., name, major, grad year) after parsing. Check PDF content.`;
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      userMessage = `A resume similar to "${originalFilename}" might already exist.`;
    } else if (currentStep === 's3_upload' || error.message.includes('S3')) {
      userMessage = `Error storing the file for resume "${originalFilename}". Please try again.`;
    } else {
       // Generic fallback for other errors
       userMessage = `An unexpected error occurred while processing "${originalFilename}": ${error.message}`;
    }

    res.status(500).json({ error: true, message: userMessage, details: error.message });
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