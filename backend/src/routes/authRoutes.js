const express = require('express');
const { adminLogin, getAdminProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.post('/admin/login', adminLogin);
router.get('/admin/profile', authenticate, getAdminProfile);

// Legacy login endpoint for backwards compatibility (redirects to admin login)
router.post('/login', adminLogin);
router.get('/me', authenticate, getAdminProfile);

module.exports = router; 