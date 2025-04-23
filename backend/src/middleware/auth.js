const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

// Authenticate user based on JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get the token from the header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Access denied. No token provided.' });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: true, message: 'Invalid token.' });
    }
    
    // Find the user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: true, message: 'User not found or inactive.' });
    }
    
    // Attach the user object to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: true, message: 'Internal server error.' });
  }
};

// Check if user has admin role
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: true, message: 'Access denied. Admin privileges required.' });
  }
  
  next();
};

module.exports = {
  authenticate,
  isAdmin
}; 