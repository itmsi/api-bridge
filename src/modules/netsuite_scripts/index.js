const express = require('express');
const router = express.Router();
const controller = require('./controller');
// const { verifyToken } = require('../../middlewares'); // Admin authentication

/**
 * @route   GET /admin/netsuite-scripts
 * @desc    Get all NetSuite script configurations
 * @access  Admin (add verifyToken middleware)
 */
router.get('/', controller.getAll);

/**
 * @route   GET /admin/netsuite-scripts/module/:module
 * @desc    Get all scripts for a module
 * @access  Admin
 */
router.get('/module/:module', controller.getByModule);

/**
 * @route   GET /admin/netsuite-scripts/:module/:operation
 * @desc    Get script configuration by module and operation
 * @access  Admin
 */
router.get('/:module/:operation', controller.getByModuleAndOperation);

/**
 * @route   POST /admin/netsuite-scripts
 * @desc    Create or update NetSuite script configuration
 * @access  Admin
 */
router.post('/', controller.create);

/**
 * @route   PUT /admin/netsuite-scripts/:module/:operation
 * @desc    Update NetSuite script configuration
 * @access  Admin
 */
router.put('/:module/:operation', controller.update);

/**
 * @route   DELETE /admin/netsuite-scripts/:module/:operation
 * @desc    Delete NetSuite script configuration (soft delete)
 * @access  Admin
 */
router.delete('/:module/:operation', controller.remove);

module.exports = router;
