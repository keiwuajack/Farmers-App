const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'crops', 'vegetables', 'fruits', 'grains',
      'livestock', 'poultry', 'dairy', 'eggs',
      'seeds', 'fertilizers', 'pesticides',
      'equipment', 'tools', 'machinery',
      'organic', 'processed', 'mushrooms', 'herbs', 'spices',
      'honey', 'fish', 'nuts', 'coffee', 'tea', 'other'
    ],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'lb', 'ton', 'piece', 'dozen', 'bag', 'liter', 'gallon', 'bundle', 'box']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String
  }],
  location: {
    type: String,
    required: true
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished', 'fresh'],
    default: 'fresh'
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  isNegotiable: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'reserved', 'expired'],
    default: 'available'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);
