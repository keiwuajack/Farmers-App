const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { normalizeKenyanMobile } = require('../utils/phone');

function isSimulationEnabled() {
  return process.env.NODE_ENV !== 'production';
}

router.post('/initialize', auth, async (req, res) => {
  try {
    if (!isSimulationEnabled()) {
      return res.status(503).json({ message: 'M-Pesa payments are not configured for this deployment.' });
    }

    const { orderId } = req.body;
    const phoneNumber = normalizeKenyanMobile(req.body.phoneNumber);
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.buyer) !== String(req.userId)) {
      return res.status(403).json({ message: 'You cannot pay for this order.' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Enter a valid Kenyan mobile number with 9 subscriber digits.' });
    }
    if (order.paymentMethod !== 'mpesa') {
      return res.status(400).json({ message: 'This order is not set up for M-Pesa.' });
    }
    if (order.paymentStatus === 'completed') {
      return res.status(409).json({ message: 'This order has already been paid.' });
    }
    if (order.status === 'cancelled') {
      return res.status(409).json({ message: 'Cancelled orders cannot be paid.' });
    }

    const paymentReference = `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    order.paymentReference = paymentReference;
    order.paymentStatus = 'pending';
    order.paymentInitiatedAt = new Date();
    order.buyerPhone = phoneNumber;
    await order.save();

    res.json({
      success: true,
      simulated: true,
      orderId: order._id,
      paymentReference,
      amount: order.totalAmount,
      phoneNumber,
      instructions: `A simulated M-Pesa prompt for KES ${order.totalAmount.toLocaleString()} will appear here. No real payment is being sent.`
    });
  } catch (error) {
    console.error('Payment initialization failed:', error);
    res.status(500).json({ message: 'Payment initialization failed.' });
  }
});

router.get('/verify/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.buyer) !== String(req.userId) && String(order.seller) !== String(req.userId)) {
      return res.status(403).json({ message: 'You cannot view this payment.' });
    }

    res.json({
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference,
      amount: order.totalAmount
    });
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({ message: 'Payment verification failed.' });
  }
});

router.post('/simulate/:orderId', auth, async (req, res) => {
  try {
    if (!isSimulationEnabled()) {
      return res.status(404).json({ message: 'Not found.' });
    }

    const { outcome } = req.body;
    if (!['success', 'failed'].includes(outcome)) {
      return res.status(400).json({ message: 'Choose a valid simulated payment outcome.' });
    }

    const order = await Order.findOne({ _id: req.params.orderId, buyer: req.userId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentMethod !== 'mpesa' || !order.paymentReference || order.paymentStatus !== 'pending') {
      return res.status(409).json({ message: 'There is no pending simulated M-Pesa payment for this order.' });
    }

    order.paymentStatus = outcome === 'success' ? 'completed' : 'failed';
    if (outcome === 'success') {
      order.status = 'confirmed';
      order.transactionId = `DEMO-${order.paymentReference}`;
      order.statusHistory.push({ status: 'confirmed', note: 'Simulated M-Pesa payment confirmed' });
    }
    await order.save();

    if (outcome === 'success') {
      try {
        await Notification.createNotification({
          user: order.seller,
          from: order.buyer,
          type: 'order',
          message: `Payment confirmed for order #${order._id.toString().slice(0, 8)}`
        });
      } catch (notificationError) {
        console.error(`Could not notify seller about paid order ${order._id}:`, notificationError);
      }
    }

    res.json({ success: true, paymentStatus: order.paymentStatus, orderId: order._id });
  } catch (error) {
    console.error('Simulated payment update failed:', error);
    res.status(500).json({ message: 'Could not update simulated payment.' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret || req.get('x-webhook-secret') !== secret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { reference, status, transactionId } = req.body;
    if (!reference || !['success', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid payment callback.' });
    }

    const order = await Order.findOne({ paymentReference: reference });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentStatus === 'completed') {
      return res.json({ success: true, paymentStatus: order.paymentStatus });
    }

    order.paymentStatus = status === 'success' ? 'completed' : 'failed';
    if (status === 'success') {
      order.status = 'confirmed';
      order.transactionId = transactionId;
      order.statusHistory.push({ status: 'confirmed', note: 'Payment callback confirmed payment' });
    }
    await order.save();
    res.json({ success: true, paymentStatus: order.paymentStatus });
  } catch (error) {
    console.error('Payment webhook processing failed:', error);
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
});

router.post('/refund/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, seller: req.userId });
    if (!order) return res.status(404).json({ message: 'Order not found or unauthorized.' });
    if (order.paymentStatus !== 'completed') {
      return res.status(400).json({ message: 'No completed payment to refund.' });
    }

    return res.status(501).json({ message: 'Refund processing requires a configured payment provider.' });
  } catch (error) {
    console.error('Refund request failed:', error);
    res.status(500).json({ message: 'Refund request failed.' });
  }
});

module.exports = router;
