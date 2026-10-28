const express = require('express');
const router = express.Router();
const Consultation = require('../models/Consultation');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');

function isParticipant(consultation, userId) {
  return String(consultation.farmer) === userId || String(consultation.veterinarian) === userId;
}

// Get all consultations for a user
router.get('/', auth, async (req, res) => {
  try {
    const consultations = await Consultation.find({
      $or: [{ farmer: req.userId }, { veterinarian: req.userId }]
    })
      .populate('farmer', 'name location phone')
      .populate('veterinarian', 'name specialization phone')
      .sort({ createdAt: -1 });
    
    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create consultation request
router.post('/', auth, async (req, res) => {
  try {
    const { veterinarian, subject, description } = req.body;
    const vet = await User.findOne({ _id: veterinarian, role: 'veterinarian' }).select('_id');
    if (!vet) return res.status(404).json({ message: 'Veterinarian not found' });
    
    const consultation = new Consultation({
      farmer: req.userId,
      veterinarian,
      subject,
      description
    });
    
    await consultation.save();
    await consultation.populate('farmer', 'name location phone');
    await consultation.populate('veterinarian', 'name specialization phone');
    
    // Create notification for veterinarian
    await Notification.createNotification({
      user: veterinarian,
      from: req.userId,
      type: 'consultation',
      message: 'requested a consultation',
      relatedConsultation: consultation._id
    });
    
    res.status(201).json(consultation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add message to consultation
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    if (!isParticipant(consultation, req.userId)) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    if (typeof message !== 'string' || !message.trim() || message.length > 5000) {
      return res.status(400).json({ message: 'Message must contain 1 to 5000 characters' });
    }
    
    consultation.messages.push({
      sender: req.userId,
      message: message.trim()
    });
    
    consultation.updatedAt = Date.now();
    await consultation.save();
    
    await consultation.populate('messages.sender', 'name role');
    
    res.json(consultation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update consultation status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    if (!isParticipant(consultation, req.userId)) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    if (!['pending', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid consultation status' });
    }
    
    consultation.status = status;
    consultation.updatedAt = Date.now();
    await consultation.save();
    
    res.json(consultation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
