// Main frontend app logic for FinPilot dashboards and calculators.

// =============================================
// STATE
// =============================================
let state = {
  userId: localStorage.getItem('finpilot_user_id'),
  name: 'Student',
  income: 0,
  expenses: { food: 0, travel: 0, shopping: 0, entertainment: 0, other: 0 },
  risk: 'medium',
  expenseLog: [],
  goals: []
};

const API_BASE = '/api';

// Persistence Helpers
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API Error');
    return json.data;
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err);
    // Optional: show a simple alert for critical errors
    return null;
  }
}

let charts = {};

// =============================================
// ADVISOR ENGINE (Rule-Based Financial Logic)
// =============================================
const advisor = {
  savings(s) {
    return s.income - this.totalExpenses(s);
  },
  totalExpenses(s) {
    return Object.values(s.expenses).reduce((a,b) => a+b, 0);
  },
  savingsRatio(s) {
    if (!s.income) return 0;
    return this.savings(s) / s.income;
  },
  expenseRatio(s) {
    if (!s.income) return 0;
    return this.totalExpenses(s) / s.income;
  },
  emergencyFund(s) {
    return 3 * this.totalExpenses(s);
  },
  investmentAllocation(s) {
    const sav = this.savings(s);
    return sav > 0 ? 0.3 * sav : 0;
  },
  sipFV(P, annualRate, years) {
    const r = annualRate / 12 / 100;
    const n = years * 12;
    if (r === 0) return P * n;
    return P * ((Math.pow(1+r, n) - 1) / r) * (1+r);
  },
  goalRequired(goal, years, annualRate = 0.06) {
    const t = years / 12; // convert months to years
    return goal / Math.pow(1 + annualRate, t);
  },
  goalFeasibility(target, duration, availableSavings) {
    const monthlyNeeded = target / duration;
    const gap = monthlyNeeded - availableSavings;
    const suggestedDuration = availableSavings > 0 ? Math.ceil(target / availableSavings) : 0;
    
    let status = 'feasible';
    let color = 'badge-green';
    let label = 'Easy';
    
    if (gap > 0) {
      status = 'not-feasible';
      color = 'badge-red';
      label = 'Not Feasible';
    } else if (monthlyNeeded > 0.7 * availableSavings) {
      status = 'moderate';
      color = 'badge-warn';
      label = 'Moderate';
    }
    
    return { monthlyNeeded, gap, suggestedDuration, status, color, label };
  },
  healthScore(s) {
    let score = 0;
    const sr = this.savingsRatio(s);
    const er = this.expenseRatio(s);

    // Savings ratio contribution (max 50 points)
    if (sr >= 0.30) score += 50;
    else if (sr >= 0.20) score += 40;
    else if (sr >= 0.10) score += 30;
    else if (sr >= 0) score += 15;
    else score += 0;

    // Expense ratio contribution (max 35 points)
    if (er <= 0.50) score += 35;
    else if (er <= 0.65) score += 25;
    else if (er <= 0.80) score += 15;
    else score += 5;

    // Income present (max 15 points)
    if (s.income > 0) score += 15;

    return Math.min(100, Math.max(0, score));
  },
  riskLevel(score) {
    if (score >= 75) return { label: 'Excellent', color: 'var(--accent)', badge: 'badge-green' };
    if (score >= 55) return { label: 'Good', color: 'var(--accent2)', badge: 'badge-blue' };
    if (score >= 35) return { label: 'Fair', color: 'var(--warn)', badge: 'badge-warn' };
    return { label: 'At Risk', color: 'var(--danger)', badge: 'badge-red' };
  },
  recommendations(s) {
    const recs = [];
    const sr = this.savingsRatio(s);
    const er = this.expenseRatio(s);
    const savings = this.savings(s);

    if (savings < 0) {
      recs.push({ icon: '🔴', text: '<strong>Critical:</strong> Your expenses exceed your income by ₹' + fmt(Math.abs(savings)) + '. Immediately cut non-essential spending.' });
    }
    if (sr < 0.20 && savings >= 0) {
      recs.push({ icon: '🟡', text: '<strong>Boost Savings:</strong> Your savings rate is ' + pct(sr) + '. Target at least 20%. Reduce discretionary expenses by ₹' + fmt(s.income * 0.20 - savings) + '/month.' });
    }
    if (sr >= 0.30) {
      recs.push({ icon: '🟢', text: '<strong>Great job!</strong> Your ' + pct(sr) + ' savings rate is excellent. Consider investing ₹' + fmt(this.investmentAllocation(s)) + '/month via SIP.' });
    }
    if (s.expenses.shopping / s.income > 0.15) {
      recs.push({ icon: '🛍', text: '<strong>Overspending on Shopping:</strong> Shopping is ' + pct(s.expenses.shopping/s.income) + ' of income. Consider the 24-hour rule before purchases.' });
    }
    if (s.expenses.entertainment / s.income > 0.10) {
      recs.push({ icon: '🎬', text: '<strong>Entertainment Budget:</strong> Entertainment costs ' + pct(s.expenses.entertainment/s.income) + ' of income. Cap it at 10%.' });
    }
    if (savings > 0) {
      recs.push({ icon: '🏦', text: '<strong>Emergency Fund Goal:</strong> Build ₹' + fmt(this.emergencyFund(s)) + ' (3× expenses). Start a recurring deposit of ₹' + fmt(Math.min(savings * 0.5, this.emergencyFund(s)/6)) + '/month.' });
    }
    if (s.expenses.food / s.income > 0.25) {
      recs.push({ icon: '🍛', text: '<strong>Food Spending:</strong> Food is ' + pct(s.expenses.food/s.income) + ' of income. Cooking at home can save ₹' + fmt(s.expenses.food * 0.3) + '/month.' });
    }
    if (recs.length === 0) {
      recs.push({ icon: '⭐', text: '<strong>On Track!</strong> Your finances look healthy. Keep investing consistently and review quarterly.' });
    }
    return recs;
  },
  investmentSuggestions(risk) {
    const options = {
      low: [
        { name: 'Public Provident Fund (PPF)', type: 'Government', return: '7.1%', risk: 'Very Low', desc: 'Tax-free government scheme. 15-year lock-in. Ideal for long-term safe wealth.' },
        { name: 'Fixed Deposits', type: 'Banking', return: '6.5–7.5%', risk: 'Very Low', desc: 'Guaranteed returns. DICGC insured up to ₹5L. Best for parking emergency funds.' },
        { name: 'Debt Mutual Funds', type: 'Mutual Fund', return: '7–9%', risk: 'Low', desc: 'Invests in bonds and T-bills. Good for 1-3 year goals with stable returns.' }
      ],
      medium: [
        { name: 'Index Funds (Nifty 50)', type: 'Mutual Fund', return: '12–14%', risk: 'Moderate', desc: 'Tracks Nifty 50. Low expense ratio. Best long-term wealth building instrument.' },
        { name: 'ELSS Tax Saver Funds', type: 'Mutual Fund', return: '14–18%', risk: 'Moderate', desc: 'Saves ₹46,800 tax under 80C. 3-year lock-in. Market-linked returns.' },
        { name: 'Balanced Advantage Funds', type: 'Hybrid Fund', return: '10–13%', risk: 'Moderate', desc: 'Auto-balances equity/debt. Lower volatility than pure equity. SIP-friendly.' }
      ],
      high: [
        { name: 'Small Cap Mutual Funds', type: 'Equity Fund', return: '18–25%', risk: 'High', desc: 'High-growth potential. Volatile in short-term. Ideal for 7+ year horizon.' },
        { name: 'Mid Cap Mutual Funds', type: 'Equity Fund', return: '16–20%', risk: 'Moderate-High', desc: 'Emerging companies. Strong growth potential with managed volatility.' },
        { name: 'Direct Stocks via Zerodha', type: 'Direct Equity', return: 'Variable', risk: 'Very High', desc: 'Requires research. High return potential. Start with blue-chips (TCS, HDFC).' }
      ]
    };
    return options[risk] || options.medium;
  }
};

// =============================================
// HELPERS
// =============================================
const fmt = n => Math.round(n).toLocaleString('en-IN');
const pct = n => (n * 100).toFixed(1) + '%';
const catColors = { food: '#ff6b6b', travel: '#4ecdc4', shopping: '#ffe66d', entertainment: '#a29bfe', other: '#74b9ff' };
const catIcons = { food: '🍛', travel: '🚌', shopping: '🛍', entertainment: '🎬', other: '📦' };

function scrollCarousel(id, offset) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: offset, behavior: 'smooth' });
}

function syncStateWithExpenses() {
  // Reset categorized expenses
  state.expenses = { food: 0, travel: 0, shopping: 0, entertainment: 0, other: 0 };
  // Sum from log
  state.expenseLog.forEach(exp => {
    if (state.expenses.hasOwnProperty(exp.category)) {
      state.expenses[exp.category] += exp.amount;
    } else {
      state.expenses.other += exp.amount;
    }
  });
}

// =============================================
// INIT
// =============================================
async function initApp() {
  const userData = {
    name: document.getElementById('ob-name').value || 'Student',
    income: parseFloat(document.getElementById('ob-income').value) || 0,
    expenses: {
      food: parseFloat(document.getElementById('ob-food').value) || 0,
      travel: parseFloat(document.getElementById('ob-travel').value) || 0,
      shopping: parseFloat(document.getElementById('ob-shop').value) || 0,
      entertainment: parseFloat(document.getElementById('ob-ent').value) || 0,
      other: parseFloat(document.getElementById('ob-other').value) || 0
    },
    riskAppetite: document.getElementById('ob-risk').value
  };

  // Create or Update User in Backend
  let user;
  if (state.userId) {
    user = await apiCall(`/user/${state.userId}`, 'PUT', userData);
  } else {
    user = await apiCall('/user', 'POST', userData);
  }

  if (user) {
    state.userId = user._id;
    localStorage.setItem('finpilot_user_id', user._id);
    state.name = user.name;
    state.income = user.income;
    state.expenses = user.expenses;
    state.risk = user.riskAppetite;

    console.log('User initialized:', user);

    // If first time (no logs), push profile expenses to backend
    // Fetch current logs first to be sure
    const currentLogs = await apiCall(`/expenses/${state.userId}`);
    if (currentLogs && currentLogs.length === 0) {
      console.log('No logs found, creating initial logs from profile...');
      const initialLogs = buildExpenseLogFromProfile();
      for (const log of initialLogs) {
        if (log.amount > 0) {
          await apiCall(`/expenses/${state.userId}`, 'POST', {
            title: log.desc,
            amount: log.amount,
            category: log.category,
            date: log.date
          });
        }
      }
      // Refresh log from backend after posting
      const serverLogs = await apiCall(`/expenses/${state.userId}`);
      if (serverLogs) state.expenseLog = serverLogs.map(l => ({ ...l, id: l._id, desc: l.title }));
    } else if (currentLogs) {
      state.expenseLog = currentLogs.map(l => ({ ...l, id: l._id, desc: l.title }));
    }
  }

  document.getElementById('overlay').style.display = 'none';
  syncStateWithExpenses();
  renderAll();
}

function buildExpenseLogFromProfile() {
  const today = new Date().toISOString().split('T')[0];
  const entries = [];

  const categoryEntries = [
    { desc: 'Food', amount: state.expenses.food, category: 'food' },
    { desc: 'Travel', amount: state.expenses.travel, category: 'travel' },
    { desc: 'Shopping', amount: state.expenses.shopping, category: 'shopping' },
    { desc: 'Entertainment', amount: state.expenses.entertainment, category: 'entertainment' },
    { desc: 'Other', amount: state.expenses.other, category: 'other' }
  ];

  categoryEntries.forEach((entry, index) => {
    if (entry.amount > 0) {
      entries.push({
        id: Date.now() + index,
        desc: entry.desc,
        amount: entry.amount,
        category: entry.category,
        date: today
      });
    }
  });


  return entries;
}

// =============================================
// RENDER ALL
// =============================================
function renderAll() {
  renderDashboard();
  renderExpenses();
  renderGoals();
  renderInvestment();
  renderSimulator();
}

// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  const s = state;
  const savings = advisor.savings(s);
  const totalExp = advisor.totalExpenses(s);
  const er = s.income ? totalExp / s.income : 0;
  const emFund = advisor.emergencyFund(s);
  const invest = advisor.investmentAllocation(s);
  const score = advisor.healthScore(s);
  const risk = advisor.riskLevel(score);

  // Greeting
  document.getElementById('dash-greeting').textContent = 'Good day, ' + s.name + ' — here\'s your financial snapshot';

  // Score ring
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;
  const ring = document.getElementById('score-ring');
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = risk.color;
  document.getElementById('score-val').textContent = score;
  document.getElementById('score-val').style.color = risk.color;

  // Badge
  const badge = document.getElementById('score-badge');
  badge.textContent = risk.label;
  badge.className = 'badge ' + risk.badge;

  // Description
  document.getElementById('score-desc').textContent =
    score >= 75 ? 'Your finances are in great shape! Keep investing consistently.' :
    score >= 55 ? 'Good foundation. Focus on increasing savings rate and monitoring expenses.' :
    score >= 35 ? 'Room for improvement. Review your budget and cut discretionary spending.' :
    'Your finances need attention. Income may not cover expenses. Take action now.';

  // Score bars
  document.getElementById('score-bars').innerHTML = `
    <div class="score-bar-row">
      <span class="score-bar-label">Savings Rate</span>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.min(100, advisor.savingsRatio(s)*100*2)}%; background:var(--accent)"></div></div>
      <span class="score-bar-val">${(advisor.savingsRatio(s)*100).toFixed(0)}%</span>
    </div>
    <div class="score-bar-row">
      <span class="score-bar-label">Expense Control</span>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.min(100,100-er*100)}%; background:var(--accent2)"></div></div>
      <span class="score-bar-val">${(100-er*100).toFixed(0)}%</span>
    </div>
  `;

  // Sidebar
  document.getElementById('sidebar-score').textContent = score + '/100';
  document.getElementById('sidebar-score').style.color = risk.color;
  document.getElementById('sidebar-risk').textContent = risk.label;

  // Summary cards
  document.getElementById('c-savings').textContent = (savings >= 0 ? '₹' : '-₹') + fmt(Math.abs(savings));
  document.getElementById('c-savings').style.color = savings >= 0 ? 'var(--accent)' : 'var(--danger)';
  document.getElementById('c-savings-ratio').textContent = pct(advisor.savingsRatio(s)) + ' savings ratio';
  document.getElementById('c-expenses').textContent = '₹' + fmt(totalExp);
  document.getElementById('c-expense-ratio').textContent = pct(er) + ' expense ratio';
  document.getElementById('c-emergency').textContent = '₹' + fmt(emFund);
  document.getElementById('c-invest').textContent = invest > 0 ? '₹' + fmt(invest) : '₹0';

  // Charts
  buildExpenseDonut();
  buildBudgetBar();

  // Goals Carousel
  renderGoalCarousel();

  // Recommendations
  const recs = advisor.recommendations(s);
  document.getElementById('rec-count').textContent = recs.length + ' action' + (recs.length !== 1 ? 's' : '');
  document.getElementById('rec-list').innerHTML = recs.map(r =>
    `<div class="rec-item"><span class="rec-icon">${r.icon}</span><div class="rec-text">${r.text}</div></div>`
  ).join('');
}

function buildExpenseDonut() {
  const s = state;
  const expData = Object.entries(s.expenses).filter(([,v]) => v > 0);
  const labels = expData.map(([k]) => k.charAt(0).toUpperCase()+k.slice(1));
  const data = expData.map(([,v]) => v);
  const colors = expData.map(([k]) => catColors[k]);
  if (charts.expenseDonut) charts.expenseDonut.destroy();
  const ctx = document.getElementById('expenseDonut').getContext('2d');
  charts.expenseDonut = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'right', labels: { color: '#8b92a5', font: { size: 11 }, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: ctx => ctx.label + ': ₹' + fmt(ctx.parsed) } }
      },
      cutout: '68%'
    }
  });
}

function buildBudgetBar() {
  const s = state;
  const cats = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Other'];
  const actual = [s.expenses.food, s.expenses.travel, s.expenses.shopping, s.expenses.entertainment, s.expenses.other];
  const budgetPct = [0.25, 0.10, 0.15, 0.10, 0.15];
  const budget = budgetPct.map(p => s.income * p);
  if (charts.budgetBar) charts.budgetBar.destroy();
  const ctx = document.getElementById('budgetBar').getContext('2d');
  charts.budgetBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cats,
      datasets: [
        { label: 'Actual', data: actual, backgroundColor: 'rgba(79,255,176,0.6)', borderRadius: 4 },
        { label: 'Budget', data: budget, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ₹' + fmt(ctx.parsed.y) } } },
      scales: {
        x: { ticks: { color: '#8b92a5', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8b92a5', font: { size: 10 }, callback: v => '₹'+fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// =============================================
// EXPENSES
// =============================================
function renderExpenses() {
  const log = state.expenseLog;
  const total = log.reduce((a,e) => a+e.amount, 0);
  document.getElementById('exp-total-badge').textContent = 'Total: ₹' + fmt(total);

  // Table
  const tbody = document.getElementById('exp-table');
  tbody.innerHTML = [...log].reverse().map(e => `
    <tr>
      <td style="color:var(--text)">${e.desc}</td>
      <td><span class="badge" style="background:${catColors[e.category]}22; color:${catColors[e.category]}">${catIcons[e.category]} ${e.category}</span></td>
      <td style="color:var(--text); font-family:'Space Mono',monospace; font-size:12px;">₹${fmt(e.amount)}</td>
      <td>${e.date}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Delete</button></td>
    </tr>
  `).join('');

  // Category summary
  const catTotals = {};
  log.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + e.amount; });
  document.getElementById('cat-summary').innerHTML = Object.entries(catTotals).map(([k,v]) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid var(--border);">
      <span style="font-size:13px; color:var(--text2)">${catIcons[k]} ${k}</span>
      <span style="font-family:'Space Mono',monospace; font-size:12px; color:${catColors[k]}">₹${fmt(v)}</span>
    </div>
  `).join('');

  // Trend line
  const last7 = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    last7.push({ 
      label: d.toLocaleDateString('en-IN',{weekday:'short'}), 
      total: log.filter(e => e.date && e.date.toString().split('T')[0] === ds).reduce((a,e) => a + e.amount, 0) 
    });
  }
  if (charts.expTrend) charts.expTrend.destroy();
  const ctx = document.getElementById('expTrendLine').getContext('2d');
  charts.expTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7.map(d=>d.label),
      datasets: [{ label: 'Daily Spend', data: last7.map(d=>d.total), borderColor: '#4fffb0', backgroundColor: 'rgba(79,255,176,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#4fffb0', pointRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b92a5', font:{size:10} }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8b92a5', font:{size:10}, callback: v=>'₹'+fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

async function addExpense() {
  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const cat = document.getElementById('exp-cat').value;
  if (!desc || !amount) return;
  
  const today = new Date().toISOString().split('T')[0];
  const newExp = await apiCall(`/expenses/${state.userId}`, 'POST', {
    title: desc,
    amount,
    category: cat,
    date: today
  });

  if (newExp) {
    state.expenseLog.push({ ...newExp, id: newExp._id, desc: newExp.title });
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
    syncStateWithExpenses();
    renderAll();
  }
}

async function deleteExpense(id) {
  const success = await apiCall(`/expenses/${state.userId}/${id}`, 'DELETE');
  if (success) {
    state.expenseLog = state.expenseLog.filter(e => e.id !== id);
    syncStateWithExpenses();
    renderAll();
  }
}

// =============================================
// GOALS
// =============================================
function renderGoals() {
  const s = state;
  const savings = advisor.savings(s);
  document.getElementById('goal-cards').innerHTML = state.goals.map(g => {
    const f = advisor.goalFeasibility(g.target, g.duration, savings);
    const progress = Math.min(100, (g.saved / g.target) * 100);
    return `
      <div class="goal-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div>
            <div class="goal-name">${g.name}</div>
            <div class="goal-target">Target: ₹${fmt(g.target)} · ${g.duration} months</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            <button class="btn btn-danger btn-sm" onclick="deleteGoal('${g.id}')">✕</button>
            <span class="badge ${f.color}">${f.label}</span>
          </div>
        </div>
        
        <div class="goal-progress"><div class="goal-progress-fill" style="width:${progress}%"></div></div>
        <div class="goal-meta" style="margin-bottom:16px;">
          <span>₹${fmt(g.saved)} saved</span>
          <span>${progress.toFixed(1)}%</span>
        </div>

        <div class="goal-stat-row">
          <span class="goal-stat-label">Monthly Required</span>
          <span class="goal-stat-val">₹${fmt(f.monthlyNeeded)}</span>
        </div>
        <div class="goal-stat-row">
          <span class="goal-stat-label">Available Savings</span>
          <span class="goal-stat-val" style="color:var(--accent)">₹${fmt(savings)}</span>
        </div>
        <div class="goal-stat-row">
          <span class="goal-stat-label">Gap</span>
          <span class="goal-stat-val" style="color:${f.gap > 0 ? 'var(--danger)' : 'var(--accent)'}">${f.gap > 0 ? '₹'+fmt(f.gap) : 'None'}</span>
        </div>

        ${f.status === 'not-feasible' ? `
          <div class="alert alert-warn" style="margin:12px 0 0; padding:8px 12px; font-size:11px;">
            Not feasible. Need ₹${fmt(f.monthlyNeeded)}/mo. Consider extending to <strong>${f.suggestedDuration} months</strong>.
          </div>
        ` : ''}

        <div style="margin-top:16px;">
          <input type="range" min="0" max="${g.target}" step="500" value="${g.saved}" style="width:100%; accent-color: var(--accent);" oninput="updateGoalProgressUI('${g.id}', this.value)" onchange="updateGoalProgress('${g.id}', this.value)">
          <div style="font-size:10px; color:var(--text3); margin-top:4px; text-align:center;">Drag to update progress</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderGoalCarousel() {
  const container = document.getElementById('goal-carousel');
  if (!container) return;
  const s = state;
  const savings = advisor.savings(s);
  const section = document.getElementById('dash-goals-section');

  if (s.goals.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  container.innerHTML = s.goals.map(g => {
    const f = advisor.goalFeasibility(g.target, g.duration, savings);
    const progress = Math.min(100, (g.saved / g.target) * 100);
    return `
      <div class="carousel-item">
        <div class="goal-card" style="min-height:160px; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div class="goal-name" style="margin-bottom:0;">${g.name}</div>
              <span class="badge ${f.color}">${f.label}</span>
            </div>
            <div class="goal-progress"><div class="goal-progress-fill" style="width:${progress}%"></div></div>
            <div class="goal-meta">
              <span>₹${fmt(g.saved)} / ₹${fmt(g.target)}</span>
              <span>${progress.toFixed(0)}%</span>
            </div>
          </div>
          <div style="margin-top:14px; font-size:11px; color:var(--text3);">
             <div style="display:flex; justify-content:space-between;"><span>Monthly Needed</span><span style="color:var(--text)">₹${fmt(f.monthlyNeeded)}</span></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function scrollCarousel(id, offset) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: offset, behavior: 'smooth' });
}

async function addGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const duration = parseInt(document.getElementById('goal-duration').value);
  if (!name || !target || !duration) return;

  const savings = advisor.savings(state);
  const f = advisor.goalFeasibility(target, duration, savings);

  if (f.status === 'not-feasible') {
    if (!confirm(`This goal is not feasible with your current savings of ₹${fmt(savings)}/month. You would need ₹${fmt(f.monthlyNeeded)}/month, or a duration of ${f.suggestedDuration} months. Add anyway?`)) {
      return;
    }
  }

  const newGoal = await apiCall(`/goals/${state.userId}`, 'POST', {
    name,
    targetAmount: target,
    duration
  });

  if (newGoal) {
    state.goals.push({ ...newGoal, id: newGoal._id, target: newGoal.targetAmount, saved: newGoal.savedAmount });
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-duration').value = '';
    renderAll();
  }
}

async function deleteGoal(id) {
  const success = await apiCall(`/goals/${state.userId}/${id}`, 'DELETE');
  if (success) {
    state.goals = state.goals.filter(g => g.id !== id);
    renderAll();
  }
}

async function updateGoalProgress(id, val) {
  const g = state.goals.find(g => g.id === id);
  if (g) {
    const updated = await apiCall(`/goals/${state.userId}/${id}`, 'PUT', { savedAmount: parseFloat(val) });
    if (updated) {
      g.saved = updated.savedAmount;
      renderAll();
    }
  }
}

function updateGoalProgressUI(id, val) {
  const g = state.goals.find(g => g.id === id);
  if (g) {
    g.saved = parseFloat(val);
    renderGoals();
    renderGoalCarousel();
  }
}


// =============================================
// INVESTMENT
// =============================================
function renderInvestment() {
  const s = state;
  const savings = advisor.savings(s);
  const invest = advisor.investmentAllocation(s);
  const emFund = advisor.emergencyFund(s);
  const totalExp = advisor.totalExpenses(s);

  document.getElementById('inv-sip').textContent = invest > 0 ? '₹'+fmt(invest) : '₹0';
  const fv5 = advisor.sipFV(invest, 12, 5);
  document.getElementById('inv-fv5').textContent = invest > 0 ? '₹'+fmt(fv5) : '₹0';

  // Readiness content
  const ready = savings > 0;
  const hasEF = savings * 6 >= emFund;
  document.getElementById('inv-readiness-content').innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:14px;">
      <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text3); margin-bottom:4px;">Monthly Surplus</div>
        <div style="font-family:'Space Mono',monospace; font-size:16px; color:${savings>0?'var(--accent)':'var(--danger)'}">₹${fmt(savings)}</div>
      </div>
      <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text3); margin-bottom:4px;">Emergency Fund Target</div>
        <div style="font-family:'Space Mono',monospace; font-size:16px; color:var(--warn)">₹${fmt(emFund)}</div>
      </div>
      <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text3); margin-bottom:4px;">Investable Amount</div>
        <div style="font-family:'Space Mono',monospace; font-size:16px; color:var(--accent2)">₹${fmt(invest)}</div>
      </div>
    </div>
    ${!ready ? '<div class="alert alert-danger"><span>⚠</span><div>Your expenses exceed income. Fix your budget before investing.</div></div>' :
      !hasEF ? '<div class="alert alert-warn"><span>⚠</span><div>Build your emergency fund of ₹'+fmt(emFund)+' before investing heavily. Allocate 50% of savings to it.</div></div>' :
      '<div class="alert alert-success"><span>✓</span><div>You\'re ready to invest! Start a monthly SIP of ₹'+fmt(invest)+' for long-term wealth creation.</div></div>'}
  `;

  // Investment cards
  const options = advisor.investmentSuggestions(s.risk);
  const riskColor = { 'Very Low': '#4fffb0', 'Low': '#4fffb0', 'Moderate': '#00d4ff', 'Moderate-High': '#ffb547', 'High': '#ff6b6b', 'Very High': '#ff5e7c', 'Variable': '#a29bfe' };
  document.getElementById('inv-cards').innerHTML = options.map(o => `
    <div class="inv-card">
      <div class="inv-tag">${o.type}</div>
      <div class="inv-name">${o.name}</div>
      <div class="inv-desc">${o.desc}</div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="inv-return-label">Expected Return</div>
          <div class="inv-return" style="color: ${riskColor[o.risk] || 'var(--accent)'}">${o.return}</div>
        </div>
        <span class="badge" style="background:${riskColor[o.risk]||'var(--accent)'}22; color:${riskColor[o.risk]||'var(--accent)'}; font-size:10px;">${o.risk} Risk</span>
      </div>
    </div>
  `).join('');

  // SIP Chart
  const sipAmt = invest;
  const sipLabels = Array.from({length:11}, (_,i)=>i+' yr');
  const sipData = sipLabels.map((_,i) => i===0 ? 0 : Math.round(advisor.sipFV(sipAmt, 12, i)));
  const sipInvested = sipLabels.map((_,i) => sipAmt * 12 * i);
  if (charts.sipChart) charts.sipChart.destroy();
  const ctx = document.getElementById('sipChart').getContext('2d');
  charts.sipChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sipLabels,
      datasets: [
        { label: 'Portfolio Value', data: sipData, borderColor: '#4fffb0', backgroundColor: 'rgba(79,255,176,0.08)', fill: true, tension: 0.4 },
        { label: 'Amount Invested', data: sipInvested, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.03)', fill: true, tension: 0, borderDash: [4,4] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#8b92a5', font: {size:11}, boxWidth: 10 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ₹' + fmt(ctx.parsed.y) } }
      },
      scales: {
        x: { ticks: { color: '#8b92a5', font:{size:10} }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8b92a5', font:{size:10}, callback: v=>'₹'+fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// =============================================
// SIMULATOR
// =============================================
function renderSimulator() {
  updateSimulator();
}

function updateSimulator() {
  const P = parseFloat(document.getElementById('sim-sip').value);
  const rate = parseFloat(document.getElementById('sim-rate').value);
  const years = parseInt(document.getElementById('sim-yrs').value);

  document.getElementById('sim-sip-val').textContent = '₹' + fmt(P);
  document.getElementById('sim-rate-val').textContent = rate + '%';
  document.getElementById('sim-yrs-val').textContent = years + ' yrs';

  const fv = advisor.sipFV(P, rate, years);
  const invested = P * 12 * years;
  const gained = fv - invested;

  document.getElementById('sim-invested').textContent = '₹' + fmt(invested);
  document.getElementById('sim-gained').textContent = '₹' + fmt(gained);
  document.getElementById('sim-corpus').textContent = '₹' + fmt(fv);

  // Yearly data
  const labels = Array.from({length: years+1}, (_,i) => i===0 ? 'Now' : 'Yr '+i);
  const portfolio = labels.map((_,i) => i===0 ? 0 : Math.round(advisor.sipFV(P, rate, i)));
  const inv = labels.map((_,i) => P * 12 * i);

  if (charts.simChart) charts.simChart.destroy();
  const ctx = document.getElementById('simChart').getContext('2d');
  charts.simChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Wealth Corpus', data: portfolio, borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
        { label: 'Capital Invested', data: inv, borderColor: 'rgba(255,255,255,0.25)', fill: true, backgroundColor: 'rgba(255,255,255,0.03)', tension: 0, borderDash: [5,5], pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: true, labels: { color: '#8b92a5', font:{size:11}, boxWidth:10 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label+': ₹'+fmt(ctx.parsed.y) } }
      },
      scales: {
        x: { ticks: { color: '#8b92a5', font:{size:10} }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8b92a5', font:{size:10}, callback: v=>'₹'+fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// =============================================
// NAVIGATION
// =============================================
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el) el.classList.add('active');
}

function goToExpensesPage() {
  const expensesNav = document.getElementById('nav-expenses');
  showPage('expenses', expensesNav);
}

async function loadInitialData() {
  const overlay = document.getElementById('overlay');
  if (!state.userId) {
    if (overlay) overlay.style.display = 'flex';
    return;
  }
  
  console.log('Loading initial data for user:', state.userId);
  
  // Hide overlay if we have a user
  if (overlay) overlay.style.display = 'none';
  
  // Fetch user profile
  const user = await apiCall(`/user/${state.userId}`);
  if (user) {
    state.name = user.name;
    state.income = user.income;
    state.expenses = user.expenses;
    state.risk = user.riskAppetite;
    
    // Prefill overlay fields
    if (document.getElementById('ob-name')) document.getElementById('ob-name').value = user.name;
    if (document.getElementById('ob-income')) document.getElementById('ob-income').value = user.income;
    if (document.getElementById('ob-food')) document.getElementById('ob-food').value = user.expenses.food;
    if (document.getElementById('ob-travel')) document.getElementById('ob-travel').value = user.expenses.travel;
    if (document.getElementById('ob-shop')) document.getElementById('ob-shop').value = user.expenses.shopping;
    if (document.getElementById('ob-ent')) document.getElementById('ob-ent').value = user.expenses.entertainment;
    if (document.getElementById('ob-other')) document.getElementById('ob-other').value = user.expenses.other;
    if (document.getElementById('ob-risk')) document.getElementById('ob-risk').value = user.riskAppetite;
  } else {
    // If user not found, clear localStorage and show overlay
    console.warn('User not found on server, resetting...');
    localStorage.removeItem('finpilot_user_id');
    state.userId = null;
    if (overlay) overlay.style.display = 'flex';
    return;
  }

  // Fetch Expenses
  const expenses = await apiCall(`/expenses/${state.userId}`);
  if (expenses) {
    state.expenseLog = expenses.map(e => ({ ...e, id: e._id, desc: e.title }));
  }

  // Fetch Goals
  const goals = await apiCall(`/goals/${state.userId}`);
  if (goals) {
    state.goals = goals.map(g => ({ ...g, id: g._id, target: g.targetAmount, saved: g.savedAmount }));
  }

  syncStateWithExpenses();
  renderAll();
}

// Start the app
loadInitialData();
