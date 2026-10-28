const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Assign delivery person
router.post('/:orderId/assign', auth, async (req, res) => {
  try {
    const { deliveryPersonName, deliveryPersonPhone, vehicleInfo } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only seller can assign delivery
    if (order.seller.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.deliveryPerson = {
      name: deliveryPersonName,
      phone: deliveryPersonPhone,
      vehicle: vehicleInfo
    };
    order.status = 'shipped';
    order.shippedAt = Date.now();
    
    // Calculate estimated delivery (2-3 days)
    const estimatedDays = order.deliveryMethod === 'shipping' ? 3 : 2;
    order.estimatedDelivery = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);

    await order.save();

    // Notify buyer
    await Notification.createNotification({
      user: order.buyer,
      from: order.seller,
      type: 'delivery',
      message: `Your order is on the way! Delivery by ${deliveryPersonName}`
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign delivery', error: error.message });
  }
});

// Update delivery location (GPS tracking)
router.post('/:orderId/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.seller.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the seller can update delivery tracking' });
    }

    if (!order.deliveryTracking) {
      order.deliveryTracking = [];
    }

    order.deliveryTracking.push({
      latitude,
      longitude,
      address,
      timestamp: Date.now()
    });

    order.currentLocation = {
      latitude,
      longitude,
      address,
      updatedAt: Date.now()
    };

    await order.save();

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(order.buyer.toString()).emit('delivery-update', {
        orderId: order._id,
        location: order.currentLocation
      });
    }

    res.json({ message: 'Location updated', location: order.currentLocation });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
});

// Get delivery tracking
router.get('/:orderId/track', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('seller', 'name phone')
      .populate('buyer', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const buyerId = String(order.buyer && order.buyer._id ? order.buyer._id : order.buyer);
    const sellerId = String(order.seller && order.seller._id ? order.seller._id : order.seller);
    if (buyerId !== req.userId && sellerId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this delivery' });
    }

    const trackingInfo = {
      orderId: order._id,
      status: order.status,
      deliveryMethod: order.deliveryMethod,
      deliveryPerson: order.deliveryPerson,
      currentLocation: order.currentLocation,
      estimatedDelivery: order.estimatedDelivery,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      trackingHistory: order.deliveryTracking || [],
      statusHistory: order.statusHistory,
      receiptConfirmed: order.receiptConfirmed,
      proofOfDelivery: order.proofOfDelivery
    };

    res.json(trackingInfo);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get tracking info', error: error.message });
  }
});

// Mark as delivered with proof
router.post('/:orderId/delivered', auth, async (req, res) => {
  try {
    const { signature, photo, notes } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.seller.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the seller can confirm delivery' });
    }

    order.status = 'delivered';
    order.deliveredAt = Date.now();
    order.proofOfDelivery = {
      signature,
      photo,
      notes,
      confirmedBy: req.userId,
      timestamp: Date.now()
    };

    await order.save();

    // Notify buyer
    await Notification.createNotification({
      user: order.buyer,
      type: 'delivery',
      message: 'Your order has been delivered! Please confirm receipt.'
    });

    res.json({ message: 'Delivery confirmed', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm delivery', error: error.message });
  }
});

// Buyer confirms receipt
router.post('/:orderId/confirm-receipt', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.status = 'completed';
    order.completedAt = Date.now();
    order.receiptConfirmed = true;

    await order.save();

    // Notify seller
    await Notification.createNotification({
      user: order.seller,
      from: order.buyer,
      type: 'order',
      message: 'Buyer confirmed receipt of the order'
    });

    res.json({ message: 'Receipt confirmed', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm receipt', error: error.message });
  }
});

module.exports = router;
