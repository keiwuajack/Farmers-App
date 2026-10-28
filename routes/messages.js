const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const groupedConversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    await User.populate(groupedConversations, {
      path: '_id',
      select: 'name role location profileImage'
    });

    const unreadMessages = await Message.aggregate([
      { $match: { recipient: userId, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadBySender = new Map(unreadMessages.map(item => [String(item._id), item.count]));
    const conversations = groupedConversations
      .filter(conversation => conversation._id)
      .map(conversation => ({
        user: conversation._id,
        lastMessage: conversation.lastMessage,
        unreadCount: unreadBySender.get(String(conversation._id._id)) || 0
      }));

    res.json(conversations);
  } catch (error) {
    console.error('Could not load conversations:', error);
    res.status(500).json({ message: 'Could not load conversations' });
  }
});

// Get unread count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.userId,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Could not load unread message count:', error);
    res.status(500).json({ message: 'Could not load unread message count' });
  }
});

// Get messages with specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId) || String(userId) === String(req.userId)) {
      return res.status(400).json({ message: 'A valid conversation partner is required' });
    }

    const recipient = await User.findById(userId).select('_id');
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    await Message.updateMany(
      { sender: userId, recipient: req.userId, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: userId },
        { sender: userId, recipient: req.userId }
      ]
    })
      .populate('sender', 'name role profileImage')
      .populate('recipient', 'name role profileImage')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Could not load conversation messages:', error);
    res.status(500).json({ message: 'Could not load conversation messages' });
  }
});

// Send message
router.post('/', auth, async (req, res) => {
  try {
    const { recipient, text } = req.body;
    const trimmedText = typeof text === 'string' ? text.trim() : '';

    if (!mongoose.isValidObjectId(recipient)) {
      return res.status(400).json({ message: 'A valid recipient is required' });
    }
    if (String(recipient) === String(req.userId)) {
      return res.status(400).json({ message: 'You cannot send a message to yourself' });
    }
    if (!trimmedText || trimmedText.length > 2000) {
      return res.status(400).json({ message: 'Messages must contain 1 to 2000 characters' });
    }
    if (!await User.exists({ _id: recipient })) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new Message({
      sender: req.userId,
      recipient,
      text: trimmedText
    });

    await message.save();
    await message.populate('sender', 'name role profileImage');
    await message.populate('recipient', 'name role profileImage');

    res.status(201).json(message);
  } catch (error) {
    console.error('Could not send message:', error);
    const isValidationError = error.name === 'ValidationError';
    res.status(isValidationError ? 400 : 500).json({
      message: isValidationError ? error.message : 'Could not send message'
    });
  }
});

module.exports = router;
