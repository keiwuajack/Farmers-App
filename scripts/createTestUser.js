const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/farmers_app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@test.com' });
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Email: test@test.com');
      console.log('Password: test123');
      process.exit(0);
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = new User({
      name: 'Test User',
      email: 'test@test.com',
      password: hashedPassword,
      phone: '0700000000',
      role: 'farmer',
      location: 'Nairobi',
      farmSize: 5
    });

    await user.save();
    console.log('✅ Test user created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: test@test.com');
    console.log('Password: test123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
