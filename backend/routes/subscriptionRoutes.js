/**
 * Routes for subscription tracking APIs.
 */
const router = require('express').Router();
const Subscription = require('../models/Subscription');

// GET all subscriptions for user
router.get('/:userId', async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.params.userId });
    const totalCost = subs.filter(s => s.isActive).reduce((a, s) => a + s.cost, 0);
    const unused = subs.filter(s => !s.inUse && s.isActive);
    res.json({ success: true, data: subs, totalCost, unusedCount: unused.length, unusedCost: unused.reduce((a,s) => a+s.cost, 0) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST add subscription
router.post('/:userId', async (req, res) => {
  try {
    const sub = new Subscription({ ...req.body, userId: req.params.userId });
    await sub.save();
    res.status(201).json({ success: true, data: sub });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// PUT toggle or update
router.put('/:userId/:subId', async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.subId, userId: req.params.userId },
      req.body, { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: sub });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// DELETE
router.delete('/:userId/:subId', async (req, res) => {
  try {
    await Subscription.findOneAndDelete({ _id: req.params.subId, userId: req.params.userId });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
