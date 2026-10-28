const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'consultation', 'post', 'message', 'order', 'review'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: ''
  },
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  relatedConsultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create notification helper function
notificationSchema.statics.createNotification = async function(data) {
  try {
    // Don't notify yourself
    if (data.user.toString() === data.from.toString()) {
      return null;
    }
    
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
