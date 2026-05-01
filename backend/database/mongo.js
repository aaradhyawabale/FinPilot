/**
 * Backend-local MongoDB connector used at runtime.
 */
const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/finpilot";
  await mongoose.connect(mongoUri);
}

module.exports = { connectDatabase };
