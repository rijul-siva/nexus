'use strict';

const { body, validationResult } = require('express-validator');
const validator = require('validator');
const { calculateAge, isValidDateOfBirth } = require('../utils/age');

const FILE_TYPES = ['Document', 'Spreadsheet', 'Presentation', 'Code', 'Note', 'Other'];
const COURSES = ['BCA', 'B.Tech CSE', 'MCA', 'Other'];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'fail',
      message: 'Validation failed.',
      errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
    });
  }
  next();
};

const validDobAndAge = [
  body('dob')
    .optional({ checkFalsy: true })
    .custom((value) => isValidDateOfBirth(value))
    .withMessage('Date of birth must be valid and indicate an age between 10 and 100.'),
  body('age')
    .optional({ checkFalsy: true })
    .isInt({ min: 10, max: 100 })
    .withMessage('Age must be an integer between 10 and 100.')
    .bail()
    .custom((value, { req }) => {
      const computedAge = calculateAge(req.body.dob);
      return computedAge !== null && Number(value) === computedAge;
    })
    .withMessage('Age is calculated from date of birth and must match it.'),
];

const validBio = [
  body('bio')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Bio must be text.')
    .bail()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Bio must be at most 300 characters.')
    .bail()
    .custom((value) => /[A-Za-z0-9]/.test(value))
    .withMessage('Bio must contain at least one letter or number.'),
];

const validCourse = body('course')
  .optional({ checkFalsy: true })
  .isIn(COURSES)
  .withMessage('Please select a valid course.');

const validPortfolio = () => body('portfolioUrl')
  .optional({ checkFalsy: true })
  .isString()
  .withMessage('Portfolio URL must be text.')
  .bail()
  .trim()
  .custom((value) => value === '' || validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true }))
  .withMessage('Please provide a valid http:// or https:// portfolio URL.');

const signupPassword = body('password')
  .isString()
  .withMessage('Password must be text.')
  .bail()
  .custom((value) => value.trim().length > 0)
  .withMessage('Password cannot be blank or only spaces.')
  .bail()
  .isLength({ min: 8, max: 72 })
  .withMessage('Password must be between 8 and 72 characters.')
  .bail()
  .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
  .withMessage('Password must be at most 72 bytes.')
  .bail()
  .matches(/(?=.*[A-Za-z])(?=.*\d)/)
  .withMessage('Password must contain at least one letter and one digit.');

exports.validateSignup = [
  body('username')
    .isString()
    .withMessage('Username must be text.')
    .bail()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters.')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Username may only contain letters, numbers, underscores, or hyphens.'),
  body('email')
    .isString()
    .withMessage('Email must be text.')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .withMessage('Email must be at most 254 characters.')
    .bail()
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  signupPassword,
  body('fullName')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Full name must be text.')
    .bail()
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s'-]{1,59}$/)
    .withMessage('Full name must be 2–60 characters using letters, spaces, hyphens, or apostrophes.'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Phone number must be text.')
    .bail()
    .trim()
    .matches(/^(\+91|0)?[6-9][0-9]{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
  ...validDobAndAge,
  validPortfolio(),
  body('city')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('City must be text.')
    .bail()
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s.-]{0,49}$/)
    .withMessage('City name must be 1–50 characters using letters, spaces, hyphens, or dots.'),
  validCourse,
  ...validBio,
  validate,
];

exports.validateChangePassword = [
  body('currentPassword')
    .isString()
    .withMessage('Current password must be text.')
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage('Current password cannot be blank.'),
  body('newPassword')
    .isString()
    .withMessage('New password must be text.')
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage('New password cannot be blank or only spaces.')
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage('New password must be between 8 and 72 characters.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('New password must be at most 72 bytes.')
    .bail()
    .matches(/(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one digit.'),
  body('confirmPassword')
    .isString()
    .withMessage('Password confirmation must be text.')
    .bail()
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Password confirmation must match the new password.'),
  validate,
];

exports.validateLogin = [
  body('username')
    .isString()
    .withMessage('Username must be text.')
    .bail()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters.')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Username may only contain letters, numbers, underscores, or hyphens.'),
  body('password')
    .isString()
    .withMessage('Password must be text.')
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage('Password cannot be blank or only spaces.')
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be between 8 and 72 characters.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password must be at most 72 bytes.'),
  validate,
];

const fileName = (required) => {
  let rule = body('name');
  if (!required) rule = rule.optional({ values: 'undefined' });
  return rule
    .isString()
    .withMessage('File name must be text.')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('File name is required and cannot be blank.')
    .isLength({ max: 100 })
    .withMessage('File name must be at most 100 characters.')
    .matches(/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,99}$/)
    .withMessage('File name may only contain letters, numbers, spaces, dots, underscores, or hyphens.');
};

const fileType = body('type')
  .optional()
  .isIn(FILE_TYPES)
  .withMessage(`File type must be one of: ${FILE_TYPES.join(', ')}.`);
const fileContent = body('content')
  .optional()
  .isString()
  .withMessage('Content must be a string.')
  .bail()
  .isLength({ max: 10000 })
  .withMessage('Content must be at most 10000 characters.');

exports.validateCreateFile = [fileName(true), fileType, fileContent, validate];
exports.validateUpdateFile = [fileName(false), fileType, fileContent, validate];

exports.validateUpdateProfile = [
  body('email')
    .optional()
    .isString()
    .withMessage('Email must be text.')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .withMessage('Email must be at most 254 characters.')
    .bail()
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('fullName')
    .optional()
    .isString()
    .withMessage('Full name must be text.')
    .bail()
    .trim()
    .matches(/^[A-Za-z][A-Za-z\s'-]{1,59}$/)
    .withMessage('Full name must be 2–60 characters using letters, spaces, hyphens, or apostrophes.'),
  body('phone')
    .optional({ values: 'undefined' })
    .isString()
    .withMessage('Phone number must be text.')
    .bail()
    .trim()
    .custom((value) => value === '' || /^(\+91|0)?[6-9][0-9]{9}$/.test(value))
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
  body('dob')
    .optional({ values: 'undefined' })
    .custom((value) => value === '' || isValidDateOfBirth(value))
    .withMessage('Date of birth must be valid and indicate an age between 10 and 100.'),
  body('age')
    .optional({ values: 'undefined' })
    .custom(() => false)
    .withMessage('Age is read-only; update date of birth instead.'),
  body('city')
    .optional()
    .isString()
    .withMessage('City must be text.')
    .bail()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must be at most 50 characters.')
    .bail()
    .custom((value) => value === '' || /^[A-Za-z][A-Za-z\s.-]{0,49}$/.test(value))
    .withMessage('City name must use letters, spaces, hyphens, or dots.'),
  body('course')
    .optional()
    .isIn(COURSES)
    .withMessage('Please select a valid course.'),
  validPortfolio(),
  ...validBio,
  validate,
];
