const router = require('express').Router();
const Goal = require('../models/Goal');
const { calcGoalRequired, calcGoalMonthlySavings } = require('../services/advisorEngine');

router.get('/:userId', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.params.userId });
    const enriched = goals.map(g => ({
      ...g.toObject(),
      monthlySavingsNeeded: Math.round(calcGoalMonthlySavings(g.targetAmount, g.duration)),
      presentValueRequired: Math.round(calcGoalRequired(g.targetAmount, g.duration, g.annualRate / 100)),
      progressPercent: parseFloat(((g.savedAmount / g.targetAmount) * 100).toFixed(1))
    }));
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/:userId', async (req, res) => {
  try {
    const goal = new Goal({ ...req.body, userId: req.params.userId });
    await goal.save();
    res.status(201).json({ success: true, data: goal });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.put('/:userId/:goalId', async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.goalId, userId: req.params.userId },
      req.body, { new: true }
    );
    if (!goal) return res.status(404).json({ success: false, error: 'Not found' });
    // Auto-complete if savedAmount >= targetAmount
    if (goal.savedAmount >= goal.targetAmount) {
      goal.status = 'completed';
      await goal.save();
    }
    res.json({ success: true, data: goal });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.delete('/:userId/:goalId', async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.goalId, userId: req.params.userId });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
