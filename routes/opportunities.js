const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { normalizeKenyanMobile } = require('../utils/phone');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', auth, async (req, res) => {
  try {
    const query = { status: 'active' };
    const { type, county, search } = req.query;

    if (type) {
      if (!['land', 'rental', 'bnb', 'job', 'worker'].includes(type)) {
        return res.status(400).json({ message: 'Unsupported opportunity type' });
      }
      query.type = type;
    }
    if (county && typeof county === 'string') query.county = new RegExp(`^${escapeRegex(county)}$`, 'i');
    if (search && typeof search === 'string') {
      const safeSearch = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      query.$or = [{ title: safeSearch }, { description: safeSearch }, { location: safeSearch }];
    }

    const opportunities = await Opportunity.find(query)
      .populate('owner', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load opportunities', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { type, intent, title, description, county, location, price, priceUnit, contactPhone } = req.body;
    const owner = await User.findById(req.userId).select('phone');
    if (!owner) return res.status(404).json({ message: 'User not found' });
    const normalizedContactPhone = contactPhone
      ? normalizeKenyanMobile(contactPhone)
      : normalizeKenyanMobile(owner.phone);
    if (!normalizedContactPhone) {
      return res.status(400).json({ message: 'Enter a valid Kenyan mobile number with 9 subscriber digits.' });
    }

    const opportunity = await Opportunity.create({
      owner: req.userId,
      type,
      intent,
      title,
      description,
      county,
      location,
      price: price === '' || price === undefined ? 0 : Number(price),
      priceUnit,
      contactPhone: normalizedContactPhone
    });
    await opportunity.populate('owner', 'name role');

    res.status(201).json(opportunity);
  } catch (error) {
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    res.status(status).json({ message: 'Could not create listing', error: error.message });
  }
});

router.get('/mine', auth, async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load your listings', error: error.message });
  }
});

router.patch('/:id/close', auth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, status: 'active' },
      { status: 'closed' },
      { new: true, runValidators: true }
    );
    if (!opportunity) return res.status(404).json({ message: 'Active listing not found' });
    res.json(opportunity);
  } catch (error) {
    res.status(400).json({ message: 'Could not close listing', error: error.message });
  }
});

module.exports = router;
