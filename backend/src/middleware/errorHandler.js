'use strict';

const mongoose = require('mongoose');

/**
 * Centralized error handler.
 * Converts known error types to structured JSON responses.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message   || 'Internal server error.';
  let status     = statusCode < 500 ? 'fail' : 'error';

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    status     = 'fail';
    message    = Object.values(err.errors)
      .map((e) => e.message)
      .join(' | ');
  }

  // ── Mongoose cast error (invalid ObjectId) ────────────────────────────────
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    status     = 'fail';
    message    = `Invalid ${err.path}: "${err.value}".`;
  }

  // ── MongoDB duplicate key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    status     = 'fail';
    const field = Object.keys(err.keyValue || {})[0];
    message    = `${field} is already in use. Please choose a different value.`;
  }

  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({ status, message, stack: err.stack });
  }

  return res.status(statusCode).json({ status, message });
};

module.exports = errorHandler;

