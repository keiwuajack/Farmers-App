const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get all reviews for a product
router.get('/product/:productId', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Add a review
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.userId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if user purchased this product (optional verification)
    const hasPurchased = await Order.findOne({
      product: productId,
      buyer: req.userId,
      status: { $in: ['delivered', 'completed'] }
    });

    const review = new Review({
      product: productId,
      user: req.userId,
      rating,
      comment,
      verified: !!hasPurchased
    });

    await review.save();

    // Update product rating
    const allReviews = await Review.find({ product: productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
    await Product.findByIdAndUpdate(productId, {
      averageRating: avgRating.toFixed(1),
      totalReviews: allReviews.length
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error adding review' });
  }
});

// Update a review
router.put('/:id', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    review.rating = rating;
    review.comment = comment;
    review.updatedAt = Date.now();
    await review.save();

    // Update product rating
    const allReviews = await Review.find({ product: review.product });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
    await Product.findByIdAndUpdate(review.product, {
      averageRating: avgRating.toFixed(1)
    });

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error updating review' });
  }
});

// Delete a review
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const productId = review.product;
    await review.deleteOne();

    // Update product rating
    const allReviews = await Review.find({ product: productId });
    const avgRating = allReviews.length > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(productId, {
      averageRating: avgRating.toFixed(1),
      totalReviews: allReviews.length
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review' });
  }
});

// Mark review as helpful
router.post('/:id/helpful', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const index = review.helpful.indexOf(req.userId);
    
    if (index > -1) {
      review.helpful.splice(index, 1); // Remove like
    } else {
      review.helpful.push(req.userId); // Add like
    }

    await review.save();
    res.json({ helpfulCount: review.helpful.length });
  } catch (error) {
    res.status(500).json({ message: 'Error updating helpful status' });
  }
});

module.exports = router;
