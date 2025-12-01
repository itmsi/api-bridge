const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { verifyApiKey } = require('../../middlewares');
// const { verifyToken } = require('../../middlewares');

/**
 * @route   GET /api/customers
 * @desc    Get all customers with pagination dan filtering
 * @access  Protected (API Key required)
 */
router.get('/', verifyApiKey, handler.getAll);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Protected (API Key required)
 */
router.get('/:id', verifyApiKey, handler.getById);

/**
 * @route   GET /api/customers/netsuite/:netsuite_id
 * @desc    Get customer by NetSuite ID (dengan on-demand sync)
 * @access  Protected (API Key required)
 */
router.get('/netsuite/:netsuite_id', verifyApiKey, handler.getByNetSuiteId);

/**
 * @route   GET /api/customers/netsuite/read
 * @desc    Read customer langsung dari NetSuite (mirror dari "Customer (Read)" Postman)
 * @access  Protected (API Key required)
 */
router.get('/netsuite/read', verifyApiKey, handler.readFromNetSuite);

/**
 * @route   POST /api/customers
 * @desc    Create new customer di NetSuite dan sync ke database lokal
 * @access  Protected (API Key required)
 */
router.post('/', verifyApiKey, handler.create);

/**
 * @route   POST /api/customers/update
 * @desc    Update customer di NetSuite dan sync ke database lokal
 * @access  Protected (API Key required)
 */
router.post('/update', verifyApiKey, handler.update);

/**
 * @route   POST /api/customers/search
 * @desc    Search customers dari NetSuite (Get Customer Page)
 * @access  Protected (API Key required)
 */
router.post('/search', verifyApiKey, handler.searchFromNetSuite);

module.exports = router;

