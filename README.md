# FinPilot – Student Financial Advisor Co-Pilot

A full-stack fintech web application that acts as a financial advisor for students using rule-based financial logic.

---

## 📁 Folder Structure

```
finpilot/
├── finpilot.html              ← Standalone frontend SPA (open directly in browser)
│
└── server/                    ← Node.js + Express backend
    ├── index.js               ← App entry point
    ├── package.json
    ├── .env.example
    ├── models/
    │   ├── User.js
    │   ├── Expense.js
    │   ├── Subscription.js
    │   └── Goal.js
    ├── routes/
    │   ├── userRoutes.js
    │   ├── expenseRoutes.js
    │   ├── subscriptionRoutes.js
    │   ├── goalRoutes.js
    │   └── analysisRoutes.js
    ├── controllers/
    │   ├── userController.js
    │   ├── expenseController.js
    │   └── analysisController.js
    └── services/
        └── advisorEngine.js   ← Core financial logic (all formulas here)
```

---

## 🚀 Quick Start

### Option A — Frontend Only (Instant)
Open `finpilot.html` directly in your browser. All logic is embedded. No server needed.

### Option B — Full Stack

#### Prerequisites
- Node.js 18+
- MongoDB (local) or MongoDB Atlas account

#### 1. Setup Backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

#### 2. Create `.env` file
```
MONGO_URI=mongodb://localhost:27017/finpilot
PORT=5000
CLIENT_URL=http://localhost:3000
```

#### 3. Test the API
```bash
# Health check
curl http://localhost:5000/

# Create a user
curl -X POST http://localhost:5000/api/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Arjun","income":25000,"expenses":{"food":4500,"travel":2000,"shopping":3000,"entertainment":1500,"other":1200},"subscriptionTotal":1200,"riskAppetite":"medium"}'

# Get full analysis (replace USER_ID)
curl http://localhost:5000/api/analysis/USER_ID

# Simulate SIP growth
curl -X POST http://localhost:5000/api/analysis/simulate \
  -H "Content-Type: application/json" \
  -d '{"monthlyAmount":2000,"annualRate":12,"years":10}'
```

---

## 📊 Financial Formulas Implemented

| Formula | Implementation |
|---|---|
| Savings | `Income − (Expenses + Subscriptions)` |
| Savings Ratio | `Savings / Income` |
| Expense Ratio | `Expenses / Income` |
| Emergency Fund | `3 × Monthly Expenses` |
| Investment Allocation | `0.30 × Savings` |
| SIP Future Value | `P × [((1+r)^n − 1)/r] × (1+r)` |
| Goal Planning | `Goal / (1+r)^t` |

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/user` | Create user profile |
| GET | `/api/user/:id` | Get user |
| PUT | `/api/user/:id` | Update user |
| GET | `/api/expenses/:userId` | Get all expenses |
| POST | `/api/expenses/:userId` | Add expense |
| PUT | `/api/expenses/:userId/:expId` | Update expense |
| DELETE | `/api/expenses/:userId/:expId` | Delete expense |
| GET | `/api/subscriptions/:userId` | Get subscriptions |
| POST | `/api/subscriptions/:userId` | Add subscription |
| PUT | `/api/subscriptions/:userId/:subId` | Toggle/update |
| DELETE | `/api/subscriptions/:userId/:subId` | Delete |
| GET | `/api/goals/:userId` | Get goals with calculations |
| POST | `/api/goals/:userId` | Add goal |
| PUT | `/api/goals/:userId/:goalId` | Update goal |
| GET | `/api/analysis/:userId` | Full financial analysis |
| POST | `/api/analysis/simulate` | SIP future value simulator |
| POST | `/api/analysis/goal-planner` | Goal planning calculator |

---

## 🧪 Sample Data (Dummy User)

```json
{
  "name": "Arjun Sharma",
  "income": 25000,
  "expenses": {
    "food": 4500,
    "travel": 2000,
    "shopping": 3000,
    "entertainment": 1500,
    "other": 1200
  },
  "subscriptionTotal": 1200,
  "riskAppetite": "medium"
}
```

Expected output:
- Savings: ₹12,600/month
- Savings Ratio: 50.4%
- Health Score: ~85/100 (Excellent)
- Emergency Fund Target: ₹37,200
- Recommended SIP: ₹3,780/month
- 5-Year SIP Corpus (12% CAGR): ~₹3,09,000

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Chart.js, Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Logic Engine | Rule-based formulas (no ML/AI APIs) |

---

## 🎓 Academic Notes

This project is a **student financial advisor simulation** built on deterministic, rule-based financial logic:
- No external financial APIs used
- No machine learning — pure formula-driven advice
- All advice follows standard personal finance principles (50-30-20 rule variants)
- Investment suggestions are educational, not licensed financial advice
