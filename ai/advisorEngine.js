/**
 * FinPilot Advisor Engine
 * Rule-based financial logic, scoring, and recommendations.
 * No external APIs or ML — pure formula-based computation.
 */

// ─────────────────────────────────────────────────
// CORE FORMULAS
// ─────────────────────────────────────────────────

/**
 * Savings = Income − Expenses
 */
const calcSavings = (income, totalExpenses) =>
  income - totalExpenses;

/**
 * Savings Ratio = Savings / Income
 */
const calcSavingsRatio = (savings, income) =>
  income > 0 ? savings / income : 0;

/**
 * Expense Ratio = Expenses / Income
 */
const calcExpenseRatio = (expenses, income) =>
  income > 0 ? expenses / income : 0;

/**
 * Emergency Fund = 3 × Monthly Expenses
 */
const calcEmergencyFund = (monthlyExpenses) => 3 * monthlyExpenses;

/**
 * Investment Allocation = 0.30 × Savings
 */
const calcInvestmentAllocation = (savings) =>
  savings > 0 ? 0.30 * savings : 0;

/**
 * SIP Future Value (Compound Interest for SIP)
 * FV = P × [((1 + r)^n - 1) / r] × (1 + r)
 * @param {number} P       - Monthly SIP amount
 * @param {number} annualRate - Annual return in % (e.g. 12)
 * @param {number} years   - Investment horizon in years
 */
const calcSipFV = (P, annualRate, years) => {
  const r = annualRate / 12 / 100;
  const n = years * 12;
  if (r === 0) return P * n;
  return P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
};

/**
 * Goal Planning — Required Present Investment
 * Required = Goal / (1 + r)^t
 * @param {number} goalAmount  - Target amount
 * @param {number} months      - Duration in months
 * @param {number} annualRate  - Annual return rate (default 6%)
 */
const calcGoalRequired = (goalAmount, months, annualRate = 0.06) => {
  const t = months / 12;
  return goalAmount / Math.pow(1 + annualRate, t);
};

/**
 * Monthly amount needed to reach goal
 */
const calcGoalMonthlySavings = (goalAmount, months) => goalAmount / months;

/**
 * Goal Feasibility Check
 */
const calcGoalFeasibility = (goalAmount, months, availableSavings) => {
  const monthlyNeeded = goalAmount / months;
  const gap = monthlyNeeded - availableSavings;
  const suggestedMonths = availableSavings > 0 ? Math.ceil(goalAmount / availableSavings) : 0;
  
  let status = 'feasible';
  if (gap > 0) status = 'not-feasible';
  else if (monthlyNeeded > 0.7 * availableSavings) status = 'moderate';
  
  return { monthlyNeeded, gap, suggestedMonths, status };
};

// ─────────────────────────────────────────────────
// FINANCIAL HEALTH SCORE (0–100)
// ─────────────────────────────────────────────────
const calcHealthScore = (income, totalExpenses) => {
  if (!income) return 0;
  const savings = calcSavings(income, totalExpenses);
  const sr = calcSavingsRatio(savings, income);
  const er = calcExpenseRatio(totalExpenses, income);
  let score = 0;

  // Savings ratio — max 50 pts (increased from 40 to rebalance)
  if (sr >= 0.30)      score += 50;
  else if (sr >= 0.20) score += 40;
  else if (sr >= 0.10) score += 30;
  else if (sr >= 0)    score += 15;

  // Expense control — max 35 pts (increased from 30)
  if (er <= 0.50)      score += 35;
  else if (er <= 0.65) score += 25;
  else if (er <= 0.80) score += 15;
  else                 score += 5;

  // Has income — 15 pts
  if (income > 0) score += 15;

  return Math.min(100, Math.max(0, score));
};

// Risk classification
const getRiskLevel = (score) => {
  if (score >= 75) return 'Excellent';
  if (score >= 55) return 'Good';
  if (score >= 35) return 'Fair';
  return 'At Risk';
};

// ─────────────────────────────────────────────────
// SMART RECOMMENDATIONS
// ─────────────────────────────────────────────────
const generateRecommendations = (income, expenses) => {
  const totalExp = Object.values(expenses).reduce((a, b) => a + b, 0);
  const savings = calcSavings(income, totalExp);
  const sr = calcSavingsRatio(savings, income);
  const er = calcExpenseRatio(totalExp, income);
  const invest = calcInvestmentAllocation(savings);
  const recs = [];

  if (savings < 0) {
    recs.push({
      priority: 'critical',
      icon: 'alert',
      title: 'Deficit Budget',
      message: `Your expenses exceed income by ₹${Math.abs(savings).toFixed(0)}. Immediately cut non-essential spending.`,
      action: 'Review and reduce shopping and entertainment first.'
    });
  }
  if (sr < 0.20 && savings >= 0) {
    recs.push({
      priority: 'high',
      icon: 'savings',
      title: 'Low Savings Rate',
      message: `Savings rate is ${(sr * 100).toFixed(1)}%. Target ≥20% for financial stability.`,
      action: `Reduce monthly expenses by ₹${((income * 0.20) - savings).toFixed(0)} to hit the 20% target.`
    });
  }
  if (sr >= 0.30) {
    recs.push({
      priority: 'positive',
      icon: 'star',
      title: 'Excellent Savings Rate',
      message: `${(sr * 100).toFixed(1)}% savings rate is outstanding. You\'re building wealth.`,
      action: `Start a monthly SIP of ₹${invest.toFixed(0)} to grow your corpus.`
    });
  }
  if (expenses.shopping && expenses.shopping / income > 0.15) {
    recs.push({
      priority: 'medium',
      icon: 'shopping',
      title: 'Overspending on Shopping',
      message: `Shopping is ${((expenses.shopping / income) * 100).toFixed(1)}% of income. Recommended cap: 15%.`,
      action: 'Apply the 24-hour rule before any non-essential purchase.'
    });
  }
  if (expenses.entertainment && expenses.entertainment / income > 0.10) {
    recs.push({
      priority: 'medium',
      icon: 'entertainment',
      title: 'Entertainment Budget Exceeded',
      message: `Entertainment is ${((expenses.entertainment / income) * 100).toFixed(1)}% of income.`,
      action: 'Set a hard limit of 10% on entertainment. Use free alternatives.'
    });
  }
  if (savings > 0) {
    const emFund = calcEmergencyFund(totalExp);
    recs.push({
      priority: 'info',
      icon: 'emergency',
      title: 'Build Emergency Fund',
      message: `Target emergency fund: ₹${emFund.toFixed(0)} (3× monthly expenses).`,
      action: `Save ₹${Math.min(savings * 0.5, emFund / 6).toFixed(0)}/month toward it.`
    });
  }

  return recs;
};

// ─────────────────────────────────────────────────
// INVESTMENT ADVISORY
// ─────────────────────────────────────────────────
const getInvestmentPlan = (income, totalExpenses, riskAppetite) => {
  const savings = calcSavings(income, totalExpenses);
  const emFund = calcEmergencyFund(totalExpenses);
  const sipAmount = calcInvestmentAllocation(savings);
  const ready = savings > 0;
  const hasEmergencyFund = savings * 6 >= emFund;

  const options = {
    low: [
      { name: 'PPF (Public Provident Fund)', type: 'Government', return: '7.1%', risk: 'Very Low', minAmount: 500 },
      { name: 'Fixed Deposits', type: 'Banking', return: '6.5–7.5%', risk: 'Very Low', minAmount: 1000 },
      { name: 'Debt Mutual Funds', type: 'Mutual Fund', return: '7–9%', risk: 'Low', minAmount: 500 }
    ],
    medium: [
      { name: 'Index Funds (Nifty 50)', type: 'Mutual Fund', return: '12–14%', risk: 'Moderate', minAmount: 500 },
      { name: 'ELSS Tax Saver', type: 'Mutual Fund', return: '14–18%', risk: 'Moderate', minAmount: 500 },
      { name: 'Balanced Advantage Fund', type: 'Hybrid Fund', return: '10–13%', risk: 'Moderate', minAmount: 500 }
    ],
    high: [
      { name: 'Small Cap Mutual Funds', type: 'Equity', return: '18–25%', risk: 'High', minAmount: 500 },
      { name: 'Mid Cap Mutual Funds', type: 'Equity', return: '16–20%', risk: 'Moderate-High', minAmount: 500 },
      { name: 'Direct Stocks', type: 'Direct Equity', return: 'Variable', risk: 'Very High', minAmount: 1000 }
    ]
  };

  const projections = {
    fv1yr:  Math.round(calcSipFV(sipAmount, 12, 1)),
    fv3yr:  Math.round(calcSipFV(sipAmount, 12, 3)),
    fv5yr:  Math.round(calcSipFV(sipAmount, 12, 5)),
    fv10yr: Math.round(calcSipFV(sipAmount, 12, 10))
  };

  return {
    ready,
    hasEmergencyFund,
    sipAmount: Math.round(sipAmount),
    emergencyFundTarget: Math.round(emFund),
    suggestions: options[riskAppetite] || options.medium,
    projections,
    status: !ready ? 'deficit' : !hasEmergencyFund ? 'needs_ef' : 'ready'
  };
};

// ─────────────────────────────────────────────────
// FULL ANALYSIS
// ─────────────────────────────────────────────────
const runFullAnalysis = (userData) => {
  const { income, expenses, riskAppetite } = userData;
  const totalExpenses = Object.values(expenses || {}).reduce((a, b) => a + b, 0);
  const savings = calcSavings(income, totalExpenses);
  const savingsRatio = calcSavingsRatio(savings, income);
  const expenseRatio = calcExpenseRatio(totalExpenses, income);
  const healthScore = calcHealthScore(income, totalExpenses);
  const riskLevel = getRiskLevel(healthScore);
  const emergencyFund = calcEmergencyFund(totalExpenses);
  const investmentAllocation = calcInvestmentAllocation(savings);
  const recommendations = generateRecommendations(income, expenses);
  const investmentPlan = getInvestmentPlan(income, totalExpenses, riskAppetite || 'medium');

  return {
    summary: {
      income,
      totalExpenses,
      savings,
      savingsRatio: parseFloat((savingsRatio * 100).toFixed(2)),
      expenseRatio: parseFloat((expenseRatio * 100).toFixed(2)),
      emergencyFund,
      investmentAllocation: Math.round(investmentAllocation)
    },
    healthScore,
    riskLevel,
    recommendations,
    investmentPlan,
    expenseBreakdown: expenses
  };
};

module.exports = {
  calcSavings, calcSavingsRatio, calcExpenseRatio,
  calcEmergencyFund, calcInvestmentAllocation,
  calcSipFV, calcGoalRequired, calcGoalMonthlySavings, calcGoalFeasibility,
  calcHealthScore, getRiskLevel,
  generateRecommendations, getInvestmentPlan,
  runFullAnalysis
};
