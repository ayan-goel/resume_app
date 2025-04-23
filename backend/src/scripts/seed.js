require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User } = require('../models');

async function seed() {
  try {
    // Sync database
    await sequelize.sync({ force: false });
    console.log('Database connected!');

    // Find or create admin user
    const [user, created] = await User.findOrCreate({
      where: { email: 'ayangoel91@gmail.com' },
      defaults: {
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        password: 'temp_password' // Temporary, will be updated
      }
    });

    // Always hash and update the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = 'Sasta1234#';

    // Update the user with the new hashed password and ensure role is admin
    await user.update({
      password: hashedPassword,
      role: 'admin' // Ensure role is set to admin
    });

    if (created) {
      console.log('Admin user created and password set!');
    } else {
      console.log('Admin user found and password updated!');
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seed(); 