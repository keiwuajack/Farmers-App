const mongoose = require('mongoose');
const { normalizeKenyanMobile } = require('../utils/phone');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['farmer', 'veterinarian', 'worker'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    set(value) {
      return normalizeKenyanMobile(value) || value;
    },
    validate: {
      validator(value) {
        return /^\+254[17]\d{8}$/.test(String(value || ''));
      },
      message: 'Phone number must be a valid Kenyan mobile number with 9 subscriber digits.'
    }
  },
  specialization: {
    type: String,
    // Only for veterinarians
    required: function() {
      return this.role === 'veterinarian';
    }
  },
  farmSize: {
    type: String,
    // Only for farmers
    required: function() {
      return this.role === 'farmer';
    }
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  resetToken: String,
  resetTokenExpiry: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
