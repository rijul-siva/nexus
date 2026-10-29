'use strict';

const User = require('../models/User');
const { calculateAge } = require('../utils/age');

/**
 * GET /api/users/profile
 * Returns the authenticated user's own profile.
 */
exports.getProfile = async (req, res, next) => {
  try {
    // req.user is populated by the protect middleware
    res.status(200).json({
      status: 'success',
      data:   { user: req.user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/profile
 * Updates editable profile fields for the authenticated user.
 * Password and username changes are intentionally excluded here
 * (they would require separate confirmation flows).
 */
exports.updateProfile = async (req, res, next) => {
  try {
    // Whitelist only safe fields – never allow password/role changes here
    const ALLOWED = ['fullName', 'phone', 'dob', 'course', 'bio', 'portfolioUrl', 'city', 'email'];
    const updates = {};
    ALLOWED.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.dob) updates.age = calculateAge(updates.dob);
    else if (updates.dob === '') updates.age = null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No valid fields provided for update.' });
    }

    // If email is being changed, check for uniqueness
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      const conflict = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (conflict) {
        return res.status(409).json({ status: 'fail', message: 'Email is already in use by another account.' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data:   { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/password
 * Changes the authenticated user's password after verifying the current one.
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status:  'fail',
        message: 'currentPassword, newPassword, and confirmPassword are all required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ status: 'fail', message: 'newPassword and confirmPassword do not match.' });
    }

    if (!newPassword.trim() || newPassword.length < 8 || newPassword.length > 72 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ status: 'fail', message: 'New password must be 8–72 characters (maximum 72 UTF-8 bytes) and cannot be blank.' });
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        status:  'fail',
        message: 'New password must contain at least one letter and one digit.',
      });
    }

    // Must re-fetch with password selected
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ status: 'fail', message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save(); // triggers pre-save hash hook

    res.status(200).json({ status: 'success', message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/account
 * Permanently deletes the authenticated user's account and all their files.
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const File = require('../models/File');
    await File.deleteMany({ owner: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

