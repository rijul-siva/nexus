'use strict';

const express    = require('express');
const authCtrl   = require('../controllers/authController');
const protect    = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validators');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', validateSignup, authCtrl.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login with username + password, returns JWT
 * @access  Public
 */
router.post('/login', validateLogin, authCtrl.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user's info
 * @access  Private
 */
router.get('/me', protect, authCtrl.getMe);

module.exports = router;

