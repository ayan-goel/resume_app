const express = require('express');
const { 
  uploadResume, 
  searchResumes, 
  getResumeById, 
  updateResume, 
  deleteResume,
  deleteAllResumes,
  getFilters
} = require('../controllers/resumeController');
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/search', searchResumes);
router.get('/filters', getFilters);
router.get('/:id', getResumeById);

// Protected routes
router.post('/', authenticate, upload.single('file'), uploadResume);
router.put('/:id', authenticate, updateResume);
router.delete('/:id', authenticate, deleteResume);
router.delete('/all/delete', authenticate, isAdmin, deleteAllResumes);

module.exports = router; 