const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['', 'farmer', 'buyer', 'farm-worker', 'veterinarian', 'other'],
    default: ''
  },
  county: {
    type: String,
    trim: true,
    maxlength: 80,
    default: ''
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  useCase: {
    type: String,
    required: true,
    enum: ['sell-produce', 'buy-products', 'find-work', 'get-advice', 'other']
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
