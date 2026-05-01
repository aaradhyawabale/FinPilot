/**
 * Mongoose schema for user financial profile data.
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  income: { type: Number, required: true, min: 0 },
  expenses: {
    food:          { type: Number, default: 0 },
    travel:        { type: Number, default: 0 },
    shopping:      { type: Number, default: 0 },
    entertainment: { type: Number, default: 0 },
    other:         { type: Number, default: 0 }
  },
  riskAppetite: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
