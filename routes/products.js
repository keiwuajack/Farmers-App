const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all products with enhanced filtering and sorting
router.get('/', auth, async (req, res) => {
  try {
    const { 
      category, search, minPrice, maxPrice, location, isOrganic, status,
      sortBy = 'createdAt', order = 'desc', page = 1, limit = 20
    } = req.query;
    
    let query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    else query.status = 'available'; // Only show available by default
    if (isOrganic === 'true') query.isOrganic = true;
    if (location) query.location = new RegExp(String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    
    // Sorting options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    
    const products = await Product.find(query)
      .populate('seller', 'name location phone role')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Product.countDocuments(query);
    
    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name location phone role bio')
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Increment views
    product.views += 1;
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create product with image upload
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      seller: req.userId
    };
    
    // Add uploaded image paths
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => `/uploads/products/${file.filename}`);
    }
    
    const product = new Product(productData);
    await product.save();
    await product.populate('seller', 'name location phone role');
    
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product with image upload
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.userId });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }
    
    Object.assign(product, req.body);
    
    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
      product.images = [...product.images, ...newImages];
    }
    
    product.updatedAt = Date.now();
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.userId });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/Unlike product
router.post('/:id/like', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const likeIndex = product.likes.indexOf(req.userId);
    
    if (likeIndex > -1) {
      product.likes.splice(likeIndex, 1);
    } else {
      product.likes.push(req.userId);
      
      // Notify seller
      if (product.seller.toString() !== req.userId) {
        await Notification.createNotification({
          user: product.seller,
          from: req.userId,
          type: 'like',
          message: 'liked your product'
        });
      }
    }
    
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my products
router.get('/my/listings', auth, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
