const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { normalizeKenyanMobile } = require('../utils/phone');
const { isValidOrderStatus } = require('../utils/orderStatus');

// Create order
router.post('/', auth, async (req, res) => {
  const reservedItems = [];
  const createdOrders = [];

  try {
    const items = Array.isArray(req.body.items)
      ? req.body.items
      : [{ product: req.body.product, quantity: req.body.quantity }];
    const deliveryAddress = String(req.body.deliveryAddress || '').trim();
    const buyerPhone = normalizeKenyanMobile(req.body.contactNumber || req.body.buyerPhone);
    const deliveryMethod = req.body.deliveryMethod || 'delivery';
    const paymentMethod = {
      cash_on_delivery: 'on-delivery',
      mobile_money: 'mpesa',
      'mobile-money': 'mpesa',
      bank_transfer: 'bank'
    }[req.body.paymentMethod] || req.body.paymentMethod || 'cash';

    if (!items.length || items.length > 20) {
      return res.status(400).json({ message: 'Checkout must contain between 1 and 20 items.' });
    }
    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required.' });
    }
    if (!buyerPhone) {
      return res.status(400).json({ message: 'Enter a valid Kenyan mobile number with 9 subscriber digits.' });
    }
    if (!['pickup', 'delivery', 'shipping'].includes(deliveryMethod)) {
      return res.status(400).json({ message: 'Invalid delivery method.' });
    }
    if (!['cash', 'mpesa', 'mobile-money', 'bank-transfer', 'bank', 'card', 'on-delivery'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }
    if (process.env.NODE_ENV === 'production' && paymentMethod === 'mpesa') {
      return res.status(503).json({ message: 'M-Pesa is not available yet. Please choose cash on delivery.' });
    }

    const normalizedItems = items.map(item => ({
      productId: String(item.product || item.productId || ''),
      quantity: Number(item.quantity)
    }));
    if (normalizedItems.some(item => !/^[a-f\d]{24}$/i.test(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      return res.status(400).json({ message: 'Each item must have a valid product and a whole-number quantity.' });
    }
    if (new Set(normalizedItems.map(item => item.productId)).size !== normalizedItems.length) {
      return res.status(400).json({ message: 'Remove duplicate products from the cart before checkout.' });
    }

    for (const item of normalizedItems) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, status: 'available', quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
      if (!product) {
        const exists = await Product.exists({ _id: item.productId });
        const error = new Error(exists ? 'A product is unavailable or no longer has enough stock.' : 'A product in the cart could not be found.');
        error.status = exists ? 409 : 404;
        throw error;
      }
      reservedItems.push({ productId: product._id, quantity: item.quantity });

      if (product.quantity === 0) {
        product.status = 'sold';
        await product.save();
      }

      if (String(product.seller) === String(req.userId)) {
        const error = new Error('You cannot buy your own product.');
        error.status = 400;
        throw error;
      }

      const order = await Order.create({
        buyer: req.userId,
        seller: product.seller,
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        pricePerUnit: product.price,
        totalAmount: product.price * item.quantity,
        deliveryAddress,
        deliveryMethod,
        paymentMethod,
        buyerPhone,
        notes: req.body.notes,
        statusHistory: [{ status: 'pending', note: 'Order placed' }]
      });
      createdOrders.push(order);
    }

    for (const order of createdOrders) {
      try {
        await Notification.createNotification({
          user: order.seller,
          from: req.userId,
          type: 'order',
          message: `placed an order for ${order.productName}`
        });
      } catch (notificationError) {
        console.error(`Could not notify seller about order ${order._id}:`, notificationError);
      }
    }

    await Promise.all(createdOrders.map(order => order.populate([
      { path: 'buyer', select: 'name phone location' },
      { path: 'seller', select: 'name phone location' },
      { path: 'product', select: 'name images' }
    ])));

    res.status(201).json({ orders: createdOrders });
  } catch (error) {
    await Order.deleteMany({ _id: { $in: createdOrders.map(order => order._id) } });
    await Promise.all(reservedItems.map(async item => {
      const product = await Product.findById(item.productId);
      if (!product) return;
      product.quantity += item.quantity;
      if (product.quantity > 0) product.status = 'available';
      await product.save();
    }));
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not place your order.' });
  }
});

// Get all orders for current user
router.get('/', auth, async (req, res) => {
  try {
    const purchases = await Order.find({ buyer: req.userId })
      .populate('product seller', 'name price images')
      .sort({ createdAt: -1 });
    
    const sales = await Order.find({ seller: req.userId })
      .populate('product buyer', 'name price images')
      .sort({ createdAt: -1 });
    
    res.json({ purchases, sales });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my orders (as buyer)
router.get('/my/purchases', auth, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.userId })
      .populate('seller', 'name phone location')
      .populate('product', 'name images category')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my sales (as seller)
router.get('/my/sales', auth, async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.userId })
      .populate('buyer', 'name phone location')
      .populate('product', 'name images category')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [{ buyer: req.userId }, { seller: req.userId }]
    })
      .populate('buyer', 'name phone location')
      .populate('seller', 'name phone location')
      .populate('product', 'name images category');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status (seller only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!isValidOrderStatus(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 500)) {
      return res.status(400).json({ message: 'Status note must be 500 characters or fewer.' });
    }

    const order = await Order.findOne({ _id: req.params.id, seller: req.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      note: note ? note.trim() : `Order ${status}`,
      timestamp: new Date()
    });
    order.updatedAt = new Date();
    await order.save();

    // Notify buyer
    await Notification.createNotification({
      user: order.buyer,
      from: req.userId,
      type: 'order',
      message: `Order status updated to: ${status}`
    });

    await order.populate('buyer seller product');
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Could not update order status.' });
  }
});

// Cancel order (buyer only, if status is pending)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyer: req.userId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending orders' });
    }
    
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      note: 'Cancelled by buyer'
    });
    order.updatedAt = Date.now();
    
    await order.save();
    
    // Restore product quantity
    const product = await Product.findById(order.product);
    if (product) {
      product.quantity += order.quantity;
      if (product.status === 'sold') {
        product.status = 'available';
      }
      await product.save();
    }
    
    // Notify seller
    await Notification.createNotification({
      user: order.seller,
      from: req.userId,
      type: 'order',
      message: 'cancelled their order'
    });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get order tracking details
router.get('/:id/tracking', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer seller product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only buyer or seller can view tracking (handle populated and unpopulated fields)
    const buyerId = order.buyer && order.buyer._id ? order.buyer._id.toString() : order.buyer.toString();
    const sellerId = order.seller && order.seller._id ? order.seller._id.toString() : order.seller.toString();
    const userId = req.userId ? req.userId.toString() : '';
    if (buyerId !== userId && sellerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({
      order,
      tracking: {
        currentStatus: order.status,
        history: order.statusHistory,
        estimatedDelivery: calculateEstimatedDelivery(order),
        canCancel: order.status === 'pending' || order.status === 'confirmed'
      }
    });
  } catch (error) {
    console.error('Error getting tracking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate estimated delivery
function calculateEstimatedDelivery(order) {
  if (order.status === 'delivered' || order.status === 'completed') {
    return 'Delivered';
  }
  if (order.status === 'cancelled') {
    return 'Cancelled';
  }
  
  const daysMap = {
    'pending': 5,
    'confirmed': 4,
    'processing': 3,
    'shipped': 2
  };
  
  const days = daysMap[order.status] || 5;
  const estimatedDate = new Date(order.createdAt);
  estimatedDate.setDate(estimatedDate.getDate() + days);
  
  return estimatedDate.toLocaleDateString();
}

module.exports = router;
