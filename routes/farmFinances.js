const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const FarmFinanceEntry = require('../models/FarmFinanceEntry');
const { normalizeFinanceEntry } = require('../utils/farmFinance');

const router = express.Router();

router.use(auth, (req, res, next) => {
  if (req.userRole !== 'farmer') {
    return res.status(403).json({ message: 'Farm finance records are available to farmer accounts.' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const [entries, summaryResult] = await Promise.all([
      FarmFinanceEntry.find({ user: req.userId })
        .sort({ date: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      FarmFinanceEntry.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
        {
          $group: {
            _id: null,
            income: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            expenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            },
            entryCount: { $sum: 1 }
          }
        }
      ])
    ]);

    const summary = summaryResult[0] || { income: 0, expenses: 0, entryCount: 0 };
    res.json({
      summary: {
        income: summary.income,
        expenses: summary.expenses,
        profit: summary.income - summary.expenses,
        entryCount: summary.entryCount
      },
      entries,
      entriesLimited: summary.entryCount > entries.length
    });
  } catch (error) {
    console.error('Could not load farm finance records:', error);
    res.status(500).json({ message: 'Could not load farm finance records.' });
  }
});

router.post('/', async (req, res) => {
  const normalized = normalizeFinanceEntry(req.body);
  if (normalized.error) {
    return res.status(400).json({ message: normalized.error });
  }

  try {
    const entry = await FarmFinanceEntry.create({
      ...normalized.value,
      user: req.userId
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('Could not save farm finance record:', error);
    res.status(500).json({ message: 'Could not save farm finance record.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ message: 'Invalid finance record.' });
  }

  try {
    const entry = await FarmFinanceEntry.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });
    if (!entry) {
      return res.status(404).json({ message: 'Finance record not found.' });
    }
    res.json({ message: 'Finance record deleted.' });
  } catch (error) {
    console.error('Could not delete farm finance record:', error);
    res.status(500).json({ message: 'Could not delete farm finance record.' });
  }
});

module.exports = router;
