const express = require('express');
const router = express.Router();
const handler = require('./handler');
// const { verifyToken } = require('../../middlewares'); // Admin authentication

/**
 * @route   GET /admin/api-clients
 * @desc    Get all registered API clients
 * @access  Admin (add verifyToken middleware)
 */
router.get('/', handler.getAll);

/**
 * @route   GET /admin/api-clients/:id
 * @desc    Get API client by ID
 * @access  Admin
 */
router.get('/:id', handler.getById);

/**
 * @route   POST /admin/api-clients
 * @desc    Register new API client
 * @access  Admin
 */
router.post('/', handler.register);

/**
 * @route   PUT /admin/api-clients/:id
 * @desc    Update API client
 * @access  Admin
 */
router.put('/:id', handler.update);

/**
 * @route   POST /admin/api-clients/:id/regenerate-secret
 * @desc    Regenerate client secret
 * @access  Admin
 */
router.post('/:id/regenerate-secret', handler.regenerateSecret);

/**
 * @route   POST /admin/api-clients/:id/toggle-status
 * @desc    Toggle active status
 * @access  Admin
 */
router.post('/:id/toggle-status', handler.toggleStatus);

/**
 * @route   DELETE /admin/api-clients/:id
 * @desc    Delete API client
 * @access  Admin
 */
router.delete('/:id', handler.remove);

module.exports = router;

