const mongoose = require('mongoose');

const financeEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'sales', 'other-income', 'seeds', 'fertilizer', 'feed',
      'veterinary', 'medicine', 'labour', 'transport', 'equipment',
      'utilities', 'other-expense'
    ],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    max: 1000000000
  },
  date: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

financeEntrySchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('FarmFinanceEntry', financeEntrySchema);
