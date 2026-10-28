const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('name email role location specialization farmSize profileImage bio');
    if (!user) return res.status(404).json({ message: 'Account not found' });

    res.set('Cache-Control', 'no-store');
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        specialization: user.specialization,
        farmSize: user.farmSize,
        profileImage: user.profileImage,
        bio: user.bio
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not verify the current account' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, password, role, location, phone, specialization, farmSize, bio } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!['farmer', 'veterinarian', 'worker'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      location,
      phone,
      specialization,
      farmSize,
      bio
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location
      }
    });
  } catch (error) {
    const isValidationError = error.name === 'ValidationError';
    res.status(isValidationError ? 400 : 500).json({
      message: isValidationError ? error.message : 'Server error'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    // Find user
    const user = typeof password === 'string' ? await User.findOne({ email }) : null;
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
