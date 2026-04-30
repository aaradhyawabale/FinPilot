const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  cost:     { type: Number, required: true, min: 0 },
  category: { type: String, enum: ['entertainment','productivity','education','health','other'], default: 'other' },
  isActive: { type: Boolean, default: true },
  inUse:    { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
