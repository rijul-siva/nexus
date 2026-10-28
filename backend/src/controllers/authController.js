'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Sign and return a JWT token string.
 * @param {string} userId - MongoDB ObjectId as string
 */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/signup
 * Creates a new user account.
 */
exports.signup = async (req, res, next) => {
  try {
    const {
      username, email, password,
      fullName, phone, dob, age,
      course, bio, portfolioUrl, city,
    } = req.body;

    // Duplicate-check with clear message
    const existingByUsername = await User.findOne({ username });
    if (existingByUsername) {
      return res.status(409).json({ status: 'fail', message: 'Username is already taken.' });
    }
    const existingByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      return res.status(409).json({ status: 'fail', message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      username, email, password,
      fullName:     fullName    || '',
      phone:        phone       || '',
      dob:          dob         || null,
      age:          age         || null,
      course:       course      || '',
      bio:          bio         || '',
      portfolioUrl: portfolioUrl || '',
      city:         city        || '',
    });

    const token = signToken(user._id);

    return res.status(201).json({
      status: 'success',
      token,
      data:   { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ status: 'fail', message: 'Username and password are required.' });
    }

    // Explicitly select password (it is excluded by default via `select: false`)
    const user = await User.findOne({ username }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect username or password.' });
    }

    const token = signToken(user._id);

    // Strip password from response object
    user.password = undefined;

    return res.status(200).json({
      status: 'success',
      token,
      data:   { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
exports.getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data:   { user: req.user },
  });
};

