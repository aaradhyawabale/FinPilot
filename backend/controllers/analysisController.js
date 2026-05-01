/**
 * Controller for analysis, simulation, and goal planning APIs.
 */
const User = require('../models/User');
const Goal = require('../models/Goal');
const { runFullAnalysis, calcGoalRequired, calcGoalMonthlySavings, calcSipFV } = require('../services/advisorEngine');

exports.getAnalysis = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });


    const analysisData = {
      income:        user.income,
      expenses:      user.expenses.toObject(),
      riskAppetite:  user.riskAppetite
    };

    const analysis = runFullAnalysis(analysisData);
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.simulateFuture = async (req, res) => {
  try {
    const { monthlyAmount, annualRate = 12, years = 10 } = req.body;
    if (!monthlyAmount) return res.status(400).json({ success: false, error: 'monthlyAmount is required' });

    const dataPoints = [];
    for (let y = 0; y <= years; y++) {
      dataPoints.push({
        year: y,
        invested: monthlyAmount * 12 * y,
        corpus: y === 0 ? 0 : Math.round(calcSipFV(monthlyAmount, annualRate, y))
      });
    }

    const finalFV = Math.round(calcSipFV(monthlyAmount, annualRate, years));
    const totalInvested = monthlyAmount * 12 * years;

    res.json({
      success: true,
      data: {
        monthlyAmount,
        annualRate,
        years,
        totalInvested,
        finalCorpus: finalFV,
        wealthGained: finalFV - totalInvested,
        dataPoints
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.analyzeGoal = async (req, res) => {
  try {
    const { goalAmount, months, annualRate = 6 } = req.body;
    const required = calcGoalRequired(goalAmount, months, annualRate / 100);
    const monthly = calcGoalMonthlySavings(goalAmount, months);
    res.json({
      success: true,
      data: {
        goalAmount,
        months,
        annualRate,
        presentValueRequired: Math.round(required),
        monthlySavingsNeeded: Math.round(monthly),
        totalSavings: Math.round(monthly * months)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
