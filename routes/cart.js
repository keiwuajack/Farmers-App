const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.userId })
      .populate({
        path: 'items.product',
        populate: { path: 'seller', select: 'name location' }
      });

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
      await cart.save();
    }

    let hasPriceChanges = false;
    for (const item of cart.items) {
      if (item.product && Number(item.price) !== Number(item.product.price)) {
        item.price = item.product.price;
        hasPriceChanges = true;
      }
    }
    if (hasPriceChanges) await cart.save();

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const productId = String(req.body.productId || '');
    const quantity = Number(req.body.quantity || 1);
    if (!/^[a-f\d]{24}$/i.test(productId) || !Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Choose a valid product and quantity.' });
    }

    // Check if product exists
    const product = await Product.findOne({ _id: productId, status: 'available' });
    if (!product) {
      return res.status(404).json({ message: 'Product is not available.' });
    }

    // Check if enough quantity available
    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient product quantity' });
    }
    if (String(product.seller) === String(req.userId)) {
      return res.status(400).json({ message: 'You cannot add your own listing to your cart.' });
    }

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const nextQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (nextQuantity > product.quantity) {
        return res.status(400).json({ message: 'Insufficient product quantity' });
      }
      cart.items[existingItemIndex].quantity = nextQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity: quantity,
        price: product.price
      });
    }

    await cart.save();
    await cart.populate({
      path: 'items.product',
      populate: { path: 'seller', select: 'name location' }
    });

    res.json(cart);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update cart item quantity
router.put('/update/:itemId', auth, async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be a positive whole number.' });
    }
    const cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Check product availability
    const product = await Product.findOne({ _id: item.product, status: 'available' });
    if (!product || product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient product quantity' });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate({
      path: 'items.product',
      populate: { path: 'seller', select: 'name location' }
    });

    res.json(cart);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item._id.toString() !== req.params.itemId
    );

    await cart.save();
    await cart.populate({
      path: 'items.product',
      populate: { path: 'seller', select: 'name location' }
    });

    res.json(cart);
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.json({ message: 'Cart cleared', cart });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
