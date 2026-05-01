/**
 * Mongoose schema for user financial goals.
 */
const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true },
  targetAmount: { type: Number, required: true },
  savedAmount:  { type: Number, default: 0 },
  duration:     { type: Number, required: true },  // months
  annualRate:   { type: Number, default: 6 },
  status:       { type: String, enum: ['active','completed','paused'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
