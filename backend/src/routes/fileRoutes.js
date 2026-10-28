'use strict';

const express   = require('express');
const fileCtrl  = require('../controllers/fileController');
const protect   = require('../middleware/auth');
const { validateCreateFile, validateUpdateFile } = require('../middleware/validators');

const router = express.Router();

// All file routes require authentication
router.use(protect);

/**
 * @route   GET  /api/files
 * @desc    List all files for the authenticated user (supports ?q= search)
 * @access  Private
 */
router.get('/', fileCtrl.getFiles);

/**
 * @route   POST /api/files
 * @desc    Create a new file
 * @access  Private
 */
router.post('/', validateCreateFile, fileCtrl.createFile);

/**
 * @route   GET  /api/files/:id
 * @desc    Get a single file by ID
 * @access  Private
 */
router.get('/:id', fileCtrl.getFile);

/**
 * @route   PATCH /api/files/:id
 * @desc    Update name, type, and/or content of a file
 * @access  Private
 */
router.patch('/:id', validateUpdateFile, fileCtrl.updateFile);

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/:id', fileCtrl.deleteFile);

module.exports = router;

