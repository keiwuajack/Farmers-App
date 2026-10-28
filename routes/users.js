const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('name role location profileImage bio');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get veterinarians
router.get('/vets', auth, async (req, res) => {
  try {
    const vets = await User.find({ role: 'veterinarian' })
      .select('name role location phone specialization profileImage bio');
    res.json(vets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get farmers
router.get('/farmers', auth, async (req, res) => {
  try {
    const farmers = await User.find({ role: 'farmer' }).select('name role location profileImage bio farmSize');
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name role location specialization farmSize profileImage bio');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, location, phone, bio, specialization, farmSize } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.name = name || user.name;
    user.location = location || user.location;
    user.phone = phone || user.phone;
    user.bio = bio || user.bio;
    
    if (user.role === 'veterinarian') {
      user.specialization = specialization || user.specialization;
    }
    
    if (user.role === 'farmer') {
      user.farmSize = farmSize || user.farmSize;
    }
    
    await user.save();
    
    const updatedUser = await User.findById(req.userId).select('-password');
    res.json(updatedUser);
  } catch (error) {
    const isValidationError = error.name === 'ValidationError';
    res.status(isValidationError ? 400 : 500).json({
      message: isValidationError ? error.message : 'Server error'
    });
  }
});

module.exports = router;
