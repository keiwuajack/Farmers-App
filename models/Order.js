const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerUnit: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'shipping'],
    default: 'pickup'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'mpesa', 'mobile-money', 'bank-transfer', 'bank', 'card', 'on-delivery'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'],
    default: 'pending'
  },
  buyerPhone: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  paymentReference: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },
  paymentInitiatedAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },
  deliveryPerson: {
    name: String,
    phone: String,
    vehicle: String
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    updatedAt: Date
  },
  deliveryTracking: [{
    latitude: Number,
    longitude: Number,
    address: String,
    timestamp: Date
  }],
  estimatedDelivery: {
    type: Date
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  proofOfDelivery: {
    signature: String,
    photo: String,
    notes: String,
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  receiptConfirmed: {
    type: Boolean,
    default: false
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
