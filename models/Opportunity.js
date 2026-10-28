const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['land', 'rental', 'bnb', 'job', 'worker'],
    required: true
  },
  intent: {
    type: String,
    enum: ['sale', 'rent', 'hire', 'seeking'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000
  },
  county: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    min: 0,
    default: 0
  },
  priceUnit: {
    type: String,
    trim: true,
    maxlength: 40,
    default: ''
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

opportunitySchema.index({ type: 1, county: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);
