const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
  category:    { type: String, enum: ['food','travel','shopping','entertainment','other'], required: true },
  date:        { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
