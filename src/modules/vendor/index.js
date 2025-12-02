const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { verifyApiKey } = require('../../middlewares');

/**
 * @route   POST /api/vendors/get
 * @desc    Get all vendors with pagination dan filtering
 * @access  Protected (API Key required)
 */
router.post('/get', verifyApiKey, handler.getAll);

/**
 * @route   GET /api/vendors/:id
 * @desc    Get vendor by ID
 * @access  Protected (API Key required)
 */
router.get('/:id', verifyApiKey, handler.getById);

/**
 * @route   GET /api/vendors/netsuite/:netsuite_id
 * @desc    Get vendor by NetSuite ID
 * @access  Protected (API Key required)
 */
router.get('/netsuite/:netsuite_id', verifyApiKey, handler.getByNetSuiteId);

/**
 * @route   POST /api/vendors/search
 * @desc    Search vendors dari NetSuite (Get Vendor Page)
 * @access  Protected (API Key required)
 */
router.post('/search', verifyApiKey, handler.searchFromNetSuite);

module.exports = router;

