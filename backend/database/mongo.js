/**
 * Backend-local MongoDB connector used at runtime.
 */
const mongoose = require("mongoose");

let isConnected = false;
async function connectDatabase() {
  if (isConnected) return;
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/finpilot";
  await mongoose.connect(mongoUri);
  isConnected = true;
}

module.exports = { connectDatabase };
