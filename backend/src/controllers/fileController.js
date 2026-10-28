'use strict';

const File = require('../models/File');

/**
 * GET /api/files
 * Returns all files owned by the authenticated user.
 * Supports ?q=<search> for name/content search.
 */
exports.getFiles = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };

    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      filter.$or = [{ name: regex }, { content: regex }];
    }

    const files = await File.find(filter).sort({ updatedAt: -1 });

    res.status(200).json({
      status:  'success',
      results: files.length,
      data:    { files },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/files/:id
 * Returns a single file (only if owned by the authenticated user).
 */
exports.getFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });

    if (!file) {
      return res.status(404).json({ status: 'fail', message: 'File not found.' });
    }

    res.status(200).json({ status: 'success', data: { file } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/files
 * Creates a new file for the authenticated user.
 */
exports.createFile = async (req, res, next) => {
  try {
    const { name, type, content } = req.body;

    const file = await File.create({
      owner:   req.user._id,
      name:    name?.trim(),
      type:    type || 'Document',
      content: content || '',
    });

    res.status(201).json({ status: 'success', data: { file } });
  } catch (err) {
    // MongoDB duplicate key (same owner + name)
    if (err.code === 11000) {
      return res.status(409).json({
        status:  'fail',
        message: `You already have a file named "${req.body.name}". Please choose a different name.`,
      });
    }
    next(err);
  }
};

/**
 * PATCH /api/files/:id
 * Updates name, type, and/or content of a file.
 */
exports.updateFile = async (req, res, next) => {
  try {
    const ALLOWED = ['name', 'type', 'content'];
    const updates = {};
    ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No valid fields provided for update.' });
    }

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!file) {
      return res.status(404).json({ status: 'fail', message: 'File not found.' });
    }

    res.status(200).json({ status: 'success', data: { file } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status:  'fail',
        message: `You already have a file named "${req.body.name}". Please choose a different name.`,
      });
    }
    next(err);
  }
};

/**
 * DELETE /api/files/:id
 * Deletes a file (only if owned by the authenticated user).
 */
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

    if (!file) {
      return res.status(404).json({ status: 'fail', message: 'File not found.' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

