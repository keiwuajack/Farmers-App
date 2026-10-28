const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Request password reset
router.post('/request', async (req, res) => {
  try {
    const emailConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (process.env.NODE_ENV === 'production' && (!emailConfigured || !process.env.CLIENT_URL)) {
      return res.status(503).json({ message: 'Password reset is temporarily unavailable. Please contact support.' });
    }

    const email = String(req.body.email || '').trim();
    const user = email ? await User.findOne({ email }) : null;
    if (!user) {
      if (process.env.NODE_ENV === 'production') {
        return res.json({ message: 'If an account exists for that email, a reset link will be sent.' });
      }
      return res.status(404).json({ message: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = new URL('/reset-password.html', process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`);
    resetUrl.searchParams.set('token', token);

    // Without SMTP settings, return the link directly instead of hanging on a mail server
    if (!emailConfigured) {
      return res.json({ message: 'Email is not configured. Use this link to reset your password:', resetUrl: resetUrl.href });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    });
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetUrl.href}">here</a> to reset your password.</p>`
    });
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('Password reset request failed:', err.message);
    res.status(500).json({ message: 'Could not send reset email' });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  const user = token ? await User.findOne({ resetToken: String(token), resetTokenExpiry: { $gt: Date.now() } }) : null;
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
  console.log('Password reset completed.');
  res.json({ message: 'Password has been reset' });
});

module.exports = router;
