const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Post = require('../models/Post');
const Feedback = require('../models/Feedback');
const auth = require('../middleware/auth');
const { completedRevenuePipeline } = require('../utils/adminMetrics');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const admin = await Admin.findById(decoded.userId);
        if (!admin) {
            throw new Error();
        }
        
        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Admin authentication required' });
    }
};

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        
        const token = jwt.sign(
            { userId: admin._id, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get dashboard statistics
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalFarmers = await User.countDocuments({ role: 'farmer' });
        const totalVets = await User.countDocuments({ role: 'veterinarian' });
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalPosts = await Post.countDocuments();
        
        // Recent signups (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSignups = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
        
        // Active products
        const activeProducts = await Product.countDocuments({ status: 'available' });
        
        // Pending orders
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        
        // Total revenue (sum of completed orders)
        const revenueResult = await Order.aggregate(completedRevenuePipeline());
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        
        res.json({
            totalUsers,
            totalFarmers,
            totalVets,
            totalProducts,
            activeProducts,
            totalOrders,
            pendingOrders,
            totalPosts,
            recentSignups,
            totalRevenue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/feedback', adminAuth, async (req, res) => {
    try {
        const feedback = await Feedback.find()
            .sort({ createdAt: -1 })
            .limit(1000)
            .select('role county rating useCase message createdAt')
            .lean();

        res.json({ feedback });
    } catch (error) {
        console.error('Could not load survey feedback:', error);
        res.status(500).json({ message: 'Could not load survey feedback.' });
    }
});

// Get all users with filters and pagination
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search, sortBy = 'createdAt', order = 'desc' } = req.query;
        
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query)
            .select('-password')
            .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        
        const count = await User.countDocuments(query);
        
        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalUsers: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user activity logs
router.get('/users/:userId/activity', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const posts = await Post.find({ author: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title category createdAt');
        
        const products = await Product.find({ seller: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title price status createdAt');
        
        const orders = await Order.find({ $or: [{ buyer: userId }, { seller: userId }] })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('product', 'name')
            .select('totalAmount status createdAt');
        
        res.json({
            posts,
            products,
            orders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all products with filters
router.get('/products', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, category, search } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const products = await Product.find(query)
            .populate('seller', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        
        const count = await Product.countDocuments(query);
        
        res.json({
            products,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalProducts: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all orders
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        
        const query = {};
        if (status) query.status = status;
        
        const orders = await Order.find(query)
            .populate('buyer', 'name email')
            .populate('seller', 'name email')
            .populate('product', 'name price')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        
        const count = await Order.countDocuments(query);
        
        res.json({
            orders,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalOrders: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/users/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Delete user's products
        await Product.deleteMany({ seller: userId });
        
        // Delete user's posts
        await Post.deleteMany({ author: userId });
        
        // Cancel user's orders
        await Order.updateMany(
            { $or: [{ buyer: userId }, { seller: userId }] },
            { status: 'cancelled' }
        );
        
        // Delete user
        await User.findByIdAndDelete(userId);
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Suspend/Activate user
router.patch('/users/:userId/status', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete product
router.delete('/products/:productId', adminAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        
        await Product.findByIdAndDelete(productId);
        
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get analytics data
router.get('/analytics/signups', adminAuth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const signups = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json(signups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get analytics - revenue over time
router.get('/analytics/revenue', adminAuth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const revenue = await Order.aggregate([
            completedRevenuePipeline({ createdAt: { $gte: startDate } })[0],
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json(revenue);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
