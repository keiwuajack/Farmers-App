const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get seller dashboard analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const sellerId = req.userId;

    // Get all seller's products
    const products = await Product.find({ seller: sellerId });
    const productIds = products.map(p => p._id);

    // Get all orders for seller's products
    const orders = await Order.find({ seller: sellerId });
    
    // Calculate statistics
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status === 'completed' || o.status === 'delivered')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    
    // Get reviews
    const reviews = await Review.find({ product: { $in: productIds } });
    const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;
    
    // Product performance (top 5 by orders)
    const productPerformance = await Order.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: '$product',
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 }
    ]);
    
    // Populate product details
    for (let perf of productPerformance) {
      const product = await Product.findById(perf._id).select('name price');
      perf.product = product;
    }
    
    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          seller: sellerId,
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Low stock products
    const lowStockProducts = products.filter(p => p.quantity < 10 && p.quantity > 0);
    
    // Out of stock
    const outOfStockProducts = products.filter(p => p.quantity === 0);
    
    res.json({
      overview: {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        pendingOrders,
        completedOrders,
        averageRating,
        totalReviews: reviews.length
      },
      productPerformance,
      monthlyRevenue,
      inventory: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// Get buyer insights
router.get('/buyers', auth, async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.userId })
      .populate('buyer', 'name email location phone')
      .sort({ createdAt: -1 });
    
    // Group by buyer
    const buyerMap = {};
    orders.forEach(order => {
      const buyerId = order.buyer._id.toString();
      if (!buyerMap[buyerId]) {
        buyerMap[buyerId] = {
          buyer: order.buyer,
          totalOrders: 0,
          totalSpent: 0,
          lastOrder: order.createdAt
        };
      }
      buyerMap[buyerId].totalOrders++;
      buyerMap[buyerId].totalSpent += order.totalAmount;
    });
    
    const topBuyers = Object.values(buyerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    res.json(topBuyers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching buyer insights', error: error.message });
  }
});

// Get inventory alerts
router.get('/inventory-alerts', auth, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.userId });
    
    const alerts = [];
    
    products.forEach(product => {
      if (product.quantity === 0) {
        alerts.push({
          type: 'out-of-stock',
          severity: 'high',
          product: product,
          message: `${product.name} is out of stock`
        });
      } else if (product.quantity < 10) {
        alerts.push({
          type: 'low-stock',
          severity: 'medium',
          product: product,
          message: `${product.name} has low stock (${product.quantity} remaining)`
        });
      }
      
      // Check for products with no recent orders (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (product.updatedAt < thirtyDaysAgo && product.quantity > 0) {
        alerts.push({
          type: 'stale-inventory',
          severity: 'low',
          product: product,
          message: `${product.name} hasn't been updated in 30 days`
        });
      }
    });
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory alerts', error: error.message });
  }
});

module.exports = router;
