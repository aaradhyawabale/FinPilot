/**
 * FinPilot backend server entry.
 * Sets middleware, API routes, and starts Express after DB connection.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDatabase } = require("./database/mongo");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/goals", require("./routes/goalRoutes"));
app.use("/api/analysis", require("./routes/analysisRoutes"));

app.get("/", (req, res) => {
  res.json({ status: "FinPilot API is running", version: "1.0.0" });
});

// Database connection middleware for serverless
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: "Database connection failed" });
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`FinPilot API running on port ${PORT}`);
  });
}

module.exports = app;
