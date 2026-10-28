'use strict';

/**
 * Test helper: starts an in-process MongoDB server so tests have
 * no external dependencies.  Uses mongodb-memory-server when installed,
 * otherwise falls back to the real MONGO_URI env var.
 */

const mongoose = require('mongoose');

let MongoMemoryServer;
let mongod;

const connect = async () => {
  try {
    // Try to use in-memory server (fast, isolated)
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  } catch {
    // Fall back to real DB (test database)
    const uri = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexus').replace(
      /\/nexus(\?.*)?$/,
      '/nexus_test$1'
    );
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

module.exports = { connect, disconnect, clearCollections };

