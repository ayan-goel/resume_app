const { User } = require('../models');
const { generateToken } = require('../utils/jwt');

// Register a new user
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: true, message: 'Email already in use.' });
    }

    // Create user with hashed password (handled by Sequelize hook)
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user' // Default to 'user' role if not specified
    });

    // Generate JWT token
    const token = generateToken(user);

    // Return user data and token
    res.status(201).json({
      error: false,
      message: 'User registered successfully.',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: true, message: 'Error registering user.' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`); // Log email

    // Find user by email
    const user = await User.findOne({ where: { email } });
    console.log('User found:', user ? user.toJSON() : 'Not Found'); // Log found user (or null)

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: true, message: 'Invalid email or password.' });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('Login failed: User inactive');
      return res.status(401).json({ error: true, message: 'User account is inactive.' });
    }

    // Verify password
    console.log(`Comparing provided password: "${password}" with stored hash...`); // Log the actual password received
    const isValidPassword = await user.validPassword(password);
    console.log(`Password validation result for ${email}: ${isValidPassword}`); // Log validation result

    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: true, message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = generateToken(user);
    console.log(`Login successful for ${email}`);

    // Return user data and token
    res.status(200).json({
      error: false,
      message: 'Login successful.',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: true, message: 'Error logging in.' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // User is attached to request through authentication middleware
    res.status(200).json({
      error: false,
      data: req.user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: true, message: 'Error retrieving profile.' });
  }
};

module.exports = {
  register,
  login,
  getProfile
}; 