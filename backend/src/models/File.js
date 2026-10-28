'use strict';

const mongoose = require('mongoose');

const FILE_TYPES = ['Document', 'Spreadsheet', 'Presentation', 'Code', 'Note', 'Other'];

const FileSchema = new mongoose.Schema(
  {
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'File must belong to a user'],
      index:    true,
    },
    name: {
      type:      String,
      required:  [true, 'File name is required'],
      trim:      true,
      maxlength: [100, 'File name must be at most 100 characters'],
      match: [
        /^[A-Za-z0-9][A-Za-z0-9 _\-.]{0,98}$/,
        'File name may only contain letters, numbers, spaces, dots, underscores, or hyphens',
      ],
    },
    type: {
      type:    String,
      enum:    { values: FILE_TYPES, message: `File type must be one of: ${FILE_TYPES.join(', ')}` },
      default: 'Document',
    },
    content: {
      type:    String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound index so one user cannot have two files with the same name
FileSchema.index({ owner: 1, name: 1 }, { unique: true });

// Strip __v from JSON
FileSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('File', FileSchema);

