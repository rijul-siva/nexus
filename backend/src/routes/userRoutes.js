'use strict';

const express    = require('express');
const userCtrl   = require('../controllers/userController');
const protect    = require('../middleware/auth');
const { validateUpdateProfile, validateChangePassword } = require('../middleware/validators');

const router = express.Router();

// All user routes require authentication
router.use(protect);

/**
 * @route   GET  /api/users/profile
 * @desc    Get the current user's profile
 * @access  Private
 */
router.get('/profile', userCtrl.getProfile);

/**
 * @route   PATCH /api/users/profile
 * @desc    Update editable profile fields
 * @access  Private
 */
router.patch('/profile', validateUpdateProfile, userCtrl.updateProfile);

/**
 * @route   PATCH /api/users/password
 * @desc    Change password (requires current password)
 * @access  Private
 */
router.patch('/password', validateChangePassword, userCtrl.changePassword);

/**
 * @route   DELETE /api/users/account
 * @desc    Permanently delete the user's account and all files
 * @access  Private
 */
router.delete('/account', userCtrl.deleteAccount);

module.exports = router;

