'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { calculateAge, isValidDateOfBirth } = require('../utils/age');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'Username is required'],
      unique:    true,
      trim:      true,
      minlength: [3,  'Username must be at least 3 characters'],
      validate: {
        validator: (value) => !value || value.trim() === value,
        message: 'Username cannot have leading or trailing spaces',
      },
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [
        /^[A-Za-z0-9_-]+$/,
        'Username may only contain letters, numbers, underscores, or hyphens',
      ],
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      trim:     true,
      lowercase: true,
      maxlength: [254, 'Email must be at most 254 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [72, 'Password must be at most 72 characters'],
      validate: {
        validator: (value) => !value || Buffer.byteLength(value, 'utf8') <= 72,
        message: 'Password must be no more than 72 UTF-8 bytes for bcrypt.',
      },
      select:    false, // never returned in queries by default
    },
    fullName: {
      type:      String,
      trim:      true,
      maxlength: [60, 'Full name must be at most 60 characters'],
      default:   '',
    },
    phone: {
      type:  String,
      trim:  true,
      match: [/^(\+91|0)?[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number'],
      default: '',
    },
    dob: {
      type:    Date,
      default: null,
      validate: {
        validator: (value) => value == null || isValidDateOfBirth(value),
        message: 'Date of birth must indicate an age between 10 and 100.',
      },
    },
    age: {
      type:    Number,
      min:     [10,  'Age must be at least 10'],
      max:     [100, 'Age must be at most 100'],
      default: null,
    },
    course: {
      type:    String,
      trim:    true,
      default: '',
    },
    bio: {
      type:      String,
      trim:      true,
      maxlength: [300, 'Bio must be at most 300 characters'],
      default:   '',
    },
    portfolioUrl: {
      type:    String,
      trim:    true,
      match:   [/^https?:\/\/.+\..+/, 'Portfolio URL must start with http:// or https://'],
      default: '',
    },
    city: {
      type:      String,
      trim:      true,
      maxlength: [50, 'City must be at most 50 characters'],
      default:   '',
    },
  },
  { timestamps: true }
);

// Keep age derived from DOB; do not trust a separately submitted age.
UserSchema.pre('validate', function (next) {
  if (this.dob) this.age = calculateAge(this.dob);
  else if (this.isModified('dob')) this.age = null;
  next();
});

// ── Hash password before save ─────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plain-text password with stored hash ─────────────
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Remove sensitive fields from JSON output ──────────────────────────────────
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);

