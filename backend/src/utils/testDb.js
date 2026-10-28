'use strict';

const mongoose = require('mongoose');

const connect = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexus_test';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};

const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
};

const clearCollections = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  }
};

module.exports = { connect, disconnect, clearCollections };
