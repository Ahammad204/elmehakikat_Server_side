const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Port
const port = process.env.PORT || 5000;

// MongoDB URI from .env
const uri = process.env.MONGODB_URI;

// MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB once at server startup
async function runMongoConnection() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

runMongoConnection();

// Root endpoint
app.get("/", (req, res) => {
  res.send("🚀 Server is Running....");
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
