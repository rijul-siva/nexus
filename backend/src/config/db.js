'use strict';

const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 * Retries on failure up to `retries` times with exponential back-off.
 */
const connectDB = async (uri, retries = 5, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.error(`❌  MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

module.exports = connectDB;

