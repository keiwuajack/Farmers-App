const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Remove duplicate products
wishlistSchema.pre('save', function(next) {
  const productIds = this.products.map(p => p.product.toString());
  const uniqueIds = [...new Set(productIds)];
  
  if (productIds.length !== uniqueIds.length) {
    this.products = this.products.filter((p, index) => 
      productIds.indexOf(p.product.toString()) === index
    );
  }
  
  next();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
