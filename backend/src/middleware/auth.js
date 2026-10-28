'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: protect routes behind JWT authentication.
 * Looks for the token in:
 *   1. Authorization header:  "Bearer <token>"
 *   2. Cookie:                "token"
 */
const protect = async (req, res, next) => {
  try {
    let token;

    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        status:  'fail',
        message: 'Not authenticated. Please log in to access this resource.',
      });
    }

    // Verify token – throws JsonWebTokenError or TokenExpiredError on failure
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check the user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status:  'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'fail', message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'fail', message: 'Token has expired. Please log in again.' });
    }
    next(err);
  }
};

module.exports = protect;

