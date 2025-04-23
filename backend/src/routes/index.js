const express = require('express');
const authRoutes = require('./authRoutes');
const resumeRoutes = require('./resumeRoutes');

const router = express.Router();

// Mount route groups
router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);

module.exports = router; 