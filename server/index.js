// FinPilot Server — Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/user',          require('./routes/userRoutes'));
app.use('/api/expenses',      require('./routes/expenseRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/goals',         require('./routes/goalRoutes'));
app.use('/api/analysis',      require('./routes/analysisRoutes'));

// Health check
app.get('/', (req, res) => res.json({ status: 'FinPilot API is running', version: '1.0.0' }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/finpilot')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`FinPilot API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
