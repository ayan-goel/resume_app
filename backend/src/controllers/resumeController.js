const { Resume, Company, Keyword, User, sequelize } = require('../models');
const { uploadFile, deleteFile } = require('../utils/s3');
const { Op } = require('sequelize');

// Helper function to find or create companies
const findOrCreateCompanies = async (companyNames) => {
  if (!companyNames || !companyNames.length) return [];
  
  const companies = [];
  for (const name of companyNames) {
    const [company] = await Company.findOrCreate({
      where: { name: name.trim() }
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
  const transaction = await sequelize.transaction();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No PDF file uploaded.' });
    }

    const { name, major, graduationYear, companies, keywords } = req.body;
    
    // Validate required fields
    if (!name || !major || !graduationYear) {
      return res.status(400).json({ error: true, message: 'Missing required fields.' });
    }

    // Parse companies and keywords
    const companyList = companies ? companies.split(',').map(c => c.trim()).filter(Boolean) : [];
    const keywordList = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];

    // Generate S3 key for the file
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const s3Key = `resumes/${sanitizedName}_${timestamp}.pdf`;
    
    // Upload file to S3
    const pdfUrl = await uploadFile(
      req.file.buffer,
      s3Key,
      'application/pdf'
    );
    
    // Create resume record
    const resume = await Resume.create({
      name,
      major,
      graduationYear,
      pdfUrl,
      s3Key,
      uploadedBy: req.user.id
    }, { transaction });
    
    // Find or create companies and associate with resume
    const companyObjects = await findOrCreateCompanies(companyList);
    await resume.setCompanies(companyObjects, { transaction });
    
    // Find or create keywords and associate with resume
    const keywordObjects = await findOrCreateKeywords(keywordList);
    await resume.setKeywords(keywordObjects, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    res.status(201).json({
      error: false,
      message: 'Resume uploaded successfully.',
      data: {
        id: resume.id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        pdfUrl: resume.pdfUrl,
        companies: companyObjects.map(c => c.name),
        keywords: keywordObjects.map(k => k.name)
      }
    });
  } catch (error) {
    // Roll back transaction on error
    await transaction.rollback();
    
    console.error('Resume upload error:', error);
    res.status(500).json({ error: true, message: 'Error uploading resume.' });
  }
};

// Search resumes with filtering
const searchResumes = async (req, res) => {
  try {
    const { query, major, company, graduationYear } = req.query;
    
    // Build the where clause for the search
    const whereClause = { isActive: true };
    const includeClause = [];
    
    // Include companies for filtering
    const companyInclude = {
      model: Company,
      as: 'companies',
      through: { attributes: [] } // Don't include junction table
    };
    
    // Include keywords for filtering
    const keywordInclude = {
      model: Keyword,
      as: 'keywords',
      through: { attributes: [] } // Don't include junction table
    };
    
    // Filter by major
    if (major) {
      whereClause.major = major;
    }
    
    // Filter by graduation year
    if (graduationYear) {
      whereClause.graduationYear = graduationYear;
    }
    
    // Filter by company
    if (company) {
      companyInclude.where = { name: company };
    }
    
    includeClause.push(companyInclude);
    includeClause.push(keywordInclude);
    
    // Add search query
    if (query) {
      const searchQuery = { [Op.iLike]: `%${query}%` };
      
      // We need to use OR to search in multiple fields
      whereClause[Op.or] = [
        { name: searchQuery },
        // Use Sequelize.literal to search in associated models
        sequelize.literal(`"companies"."name" ILIKE '%${query}%'`),
        sequelize.literal(`"keywords"."name" ILIKE '%${query}%'`)
      ];
    }
    
    // Query the database
    const resumes = await Resume.findAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']]
    });
    
    // Format the response
    const formattedResumes = resumes.map(resume => ({
      id: resume.id,
      name: resume.name,
      major: resume.major,
      graduationYear: resume.graduationYear,
      pdfUrl: resume.pdfUrl,
      companies: resume.companies.map(c => c.name),
      keywords: resume.keywords.map(k => k.name)
    }));
    
    res.status(200).json({
      error: false,
      count: formattedResumes.length,
      data: formattedResumes
    });
  } catch (error) {
    console.error('Resume search error:', error);
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

// Get available filters (majors, companies, graduation years)
const getFilters = async (req, res) => {
  try {
    // Get unique majors
    const majors = await Resume.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('major')), 'major']],
      where: { isActive: true },
      raw: true
    });
    
    // Get unique graduation years
    const graduationYears = await Resume.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('graduationYear')), 'graduationYear']],
      where: { isActive: true },
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
    
    // Format the response
    const filters = {
      majors: majors.map(m => m.major),
      graduationYears: graduationYears.map(y => y.graduationYear),
      companies: companies.map(c => c.name)
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
  getFilters
}; 