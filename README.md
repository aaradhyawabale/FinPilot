# FinPilot

FinPilot is a student-friendly full-stack financial advisor project.
It helps users track expenses, evaluate savings health, and get rule-based investment guidance.

## Project Structure

```text
FinPilot/
├── frontend/
│   ├── components/
│   │   └── app.js
│   ├── pages/
│   ├── styles/
│   │   └── main.css
│   ├── assets/
│   └── index.html
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   │   └── advisorEngine.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── database/
│   └── config/
│       └── mongo.js
├── ai/
│   └── advisorEngine.js
├── shared/
└── README.md
```

## What Lives Where

- `frontend/`: UI, styling, charts, and browser-side interactions.
- `backend/`: REST API routes, controllers, DB models, and app server startup.
- `database/`: database connection setup.
- `ai/`: shared rule-based financial analysis logic (no external AI APIs).
- `shared/`: reserved place for common utilities.

## How To Run

### 1) Start Backend

```bash
cd backend
npm install
cp .env.example .env
```

Update `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/finpilot
PORT=5001
CLIENT_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

Backend health check:

```bash
curl http://localhost:5001/
```

### 2) Start Frontend

From project root:

```bash
python3 -m http.server 3000
```

Open:

`http://localhost:3000/frontend/index.html`

## Basic Working Flow

1. User fills financial profile on the frontend.
2. Frontend shows dashboards and calculators.
3. Backend provides CRUD APIs for users, expenses, goals, subscriptions, and analysis.
4. Financial formulas are applied using rule-based logic from `ai/advisorEngine.js`.
5. MongoDB stores user data and transactions.

## Notes

- This project does **not** use external ML/LLM APIs.
- All advisory output is formula-based and educational.
