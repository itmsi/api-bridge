const express = require('express');
const router = express.Router();
const controller = require('./controller');
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
  controller.getAll
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
  controller.getById
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
  controller.create
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
  controller.update
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
  controller.remove
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
  controller.restore
);

module.exports = router;

