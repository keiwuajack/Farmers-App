const express = require('express');
const rateLimit = require('express-rate-limit');
const Feedback = require('../models/Feedback');

const router = express.Router();
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many feedback submissions. Please try again later.' }
});

const allowedRoles = new Set(['', 'farmer', 'buyer', 'farm-worker', 'veterinarian', 'other']);
const allowedUseCases = new Set(['sell-produce', 'buy-products', 'find-work', 'get-advice', 'other']);

router.post('/', feedbackLimiter, async (req, res) => {
  const { role = '', county = '', rating, useCase, message = '' } = req.body || {};
  const numericRating = Number(rating);

  if (!allowedRoles.has(role) || !allowedUseCases.has(useCase)) {
    return res.status(400).json({ message: 'Please select valid survey answers.' });
  }
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Please rate how easy the app was to use.' });
  }
  if (typeof county !== 'string' || county.length > 80 || typeof message !== 'string' || message.length > 1000) {
    return res.status(400).json({ message: 'County or feedback is too long.' });
  }

  try {
    await Feedback.create({
      role,
      county: county.trim(),
      rating: numericRating,
      useCase,
      message: message.trim()
    });
    return res.status(201).json({ message: 'Thank you — your feedback has been recorded.' });
  } catch (error) {
    console.error('Could not save survey feedback:', error);
    return res.status(500).json({ message: 'We could not save your feedback. Please try again.' });
  }
});

module.exports = router;
