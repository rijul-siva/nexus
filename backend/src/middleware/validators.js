'use strict';

const { body, validationResult } = require('express-validator');

/** Collect express-validator errors and return a 422 if any exist. */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status:  'fail',
      message: 'Validation failed.',
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Auth validation rules ─────────────────────────────────────────────────────

exports.validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters.')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Username may only contain letters, numbers, underscores, or hyphens.'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one digit.'),

  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s'-]{1,59}$/)
    .withMessage("Full name must start with a letter and may contain letters, spaces, hyphens, or apostrophes."),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+91|0)?[6-9][0-9]{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),

  body('age')
    .optional({ checkFalsy: true })
    .isInt({ min: 10, max: 100 })
    .withMessage('Age must be between 10 and 100.'),

  body('portfolioUrl')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^https?:\/\/.+\..+/)
    .withMessage('Portfolio URL must start with http:// or https://.'),

  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s\-.]{0,49}$/)
    .withMessage('City name should contain only letters, spaces, or hyphens.'),

  validate,
];

exports.validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
];

// ── File validation rules ─────────────────────────────────────────────────────

const FILE_TYPES = ['Document', 'Spreadsheet', 'Presentation', 'Code', 'Note', 'Other'];

exports.validateCreateFile = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('File name is required.')
    .isLength({ max: 100 })
    .withMessage('File name must be at most 100 characters.')
    .matches(/^[A-Za-z0-9][A-Za-z0-9 _\-.]{0,98}$/)
    .withMessage('File name may only contain letters, numbers, spaces, dots, underscores, or hyphens.'),

  body('type')
    .optional()
    .isIn(FILE_TYPES)
    .withMessage(`File type must be one of: ${FILE_TYPES.join(', ')}.`),

  body('content').optional().isString().withMessage('Content must be a string.'),

  validate,
];

exports.validateUpdateFile = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('File name cannot be empty.')
    .isLength({ max: 100 })
    .withMessage('File name must be at most 100 characters.')
    .matches(/^[A-Za-z0-9][A-Za-z0-9 _\-.]{0,98}$/)
    .withMessage('File name may only contain letters, numbers, spaces, dots, underscores, or hyphens.'),

  body('type')
    .optional()
    .isIn(FILE_TYPES)
    .withMessage(`File type must be one of: ${FILE_TYPES.join(', ')}.`),

  body('content').optional().isString().withMessage('Content must be a string.'),

  validate,
];

// ── Profile update validation rules ──────────────────────────────────────────

exports.validateUpdateProfile = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s'-]{1,59}$/)
    .withMessage("Full name must start with a letter and may contain letters, spaces, hyphens, or apostrophes."),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+91|0)?[6-9][0-9]{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),

  body('age')
    .optional({ checkFalsy: true })
    .isInt({ min: 10, max: 100 })
    .withMessage('Age must be between 10 and 100.'),

  body('portfolioUrl')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^https?:\/\/.+\..+/)
    .withMessage('Portfolio URL must start with http:// or https://.'),

  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s\-.]{0,49}$/)
    .withMessage('City name should contain only letters, spaces, or hyphens.'),

  body('bio')
    .optional({ checkFalsy: true })
    .isLength({ max: 300 })
    .withMessage('Bio must be at most 300 characters.'),

  validate,
];

