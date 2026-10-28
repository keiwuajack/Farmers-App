const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Get user's wishlist
router.get('/', auth, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.userId })
      .populate({
        path: 'products.product',
        populate: { path: 'seller', select: 'name location' }
      });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.userId, products: [] });
      await wishlist.save();
    }

    res.json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add product to wishlist
router.post('/add/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ user: req.userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.userId, products: [] });
    }

    // Check if product already in wishlist
    const exists = wishlist.products.some(
      item => item.product.toString() === productId
    );

    if (exists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    wishlist.products.push({ product: productId });
    await wishlist.save();
    await wishlist.populate({
      path: 'products.product',
      populate: { path: 'seller', select: 'name location' }
    });

    res.json(wishlist);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove product from wishlist
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = wishlist.products.filter(
      item => item.product.toString() !== req.params.productId
    );

    await wishlist.save();
    await wishlist.populate({
      path: 'products.product',
      populate: { path: 'seller', select: 'name location' }
    });

    res.json(wishlist);
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear wishlist
router.delete('/clear', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = [];
    await wishlist.save();

    res.json({ message: 'Wishlist cleared', wishlist });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Move wishlist item to cart
router.post('/move-to-cart/:productId', auth, async (req, res) => {
  try {
    const Cart = require('../models/Cart');
    const wishlist = await Wishlist.findOne({ user: req.userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add to cart
    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === req.params.productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += 1;
    } else {
      cart.items.push({
        product: req.params.productId,
        quantity: 1,
        price: product.price
      });
    }

    await cart.save();

    // Remove from wishlist
    wishlist.products = wishlist.products.filter(
      item => item.product.toString() !== req.params.productId
    );
    await wishlist.save();

    res.json({ message: 'Moved to cart', cart, wishlist });
  } catch (error) {
    console.error('Error moving to cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
