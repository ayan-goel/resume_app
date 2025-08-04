// Simple admin authentication - no more JWT user management

// Admin login with simple password check
const adminLogin = async (req, res) => {
  try {
    const { password } = req.body;
    
    // Check if password matches the admin password
    if (password === 'AyanIsAwesome') {
      // Generate a simple session token (we can reuse JWT utils for this)
      const { generateToken } = require('../utils/jwt');
      const token = generateToken({ role: 'admin', id: 'admin' });
      
      console.log('Admin login successful');
      
      // Return success with token
      res.status(200).json({
        error: false,
        message: 'Admin login successful.',
        data: {
          role: 'admin',
          token
        }
      });
    } else {
      console.log('Admin login failed: Invalid password');
      res.status(401).json({ error: true, message: 'Invalid admin password.' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: true, message: 'Error during admin login.' });
  }
};

// Get admin profile (just returns admin info)
const getAdminProfile = async (req, res) => {
  try {
    res.status(200).json({
      error: false,
      data: {
        role: 'admin',
        id: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin profile error:', error);
    res.status(500).json({ error: true, message: 'Error retrieving admin profile.' });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile
}; 