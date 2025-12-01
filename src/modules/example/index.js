const express = require('express');
const router = express.Router();
const handler = require('./handler');
const {
  createValidation,
  updateValidation,
  getByIdValidation,
  listValidation
} = require('./validation');
// Uncomment jika sudah ada authentication
// const { verifyToken } = require('../../middlewares');
const { validateMiddleware } = require('../../middlewares/validation');

/**
 * @route   GET /api/examples
 * @desc    Get all examples with pagination
 * @access  Public (change to verifyToken for protected)
 */
router.get(
  '/',
  listValidation,
  validateMiddleware,
  handler.getAll
);

/**
 * @route   GET /api/examples/:id
 * @desc    Get example by ID
 * @access  Public
 */
router.get(
  '/:id',
  getByIdValidation,
  validateMiddleware,
  handler.getById
);

/**
 * @route   POST /api/examples
 * @desc    Create new example
 * @access  Public
 */
router.post(
  '/',
  createValidation,
  validateMiddleware,
  handler.create
);

/**
 * @route   PUT /api/examples/:id
 * @desc    Update example
 * @access  Public
 */
router.put(
  '/:id',
  updateValidation,
  validateMiddleware,
  handler.update
);

/**
 * @route   DELETE /api/examples/:id
 * @desc    Soft delete example
 * @access  Public
 */
router.delete(
  '/:id',
  getByIdValidation,
  validateMiddleware,
  handler.remove
);

/**
 * @route   POST /api/examples/:id/restore
 * @desc    Restore soft deleted example
 * @access  Public
 */
router.post(
  '/:id/restore',
  getByIdValidation,
  validateMiddleware,
  handler.restore
);

module.exports = router;

