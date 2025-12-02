const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyApiKey } = require('../../middlewares');
// const { verifyToken } = require('../../middlewares');

/**
 * @route   POST /api/customers/get
 * @desc    Get all customers with pagination dan filtering
 * @access  Protected (API Key required)
 */
router.post('/get', verifyApiKey, controller.getAll);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Protected (API Key required)
 */
router.get('/:id', verifyApiKey, controller.getById);

/**
 * @route   GET /api/customers/netsuite/:netsuite_id
 * @desc    Get customer by NetSuite ID (dengan on-demand sync)
 * @access  Protected (API Key required)
 */
router.get('/netsuite/:netsuite_id', verifyApiKey, controller.getByNetSuiteId);

/**
 * @route   GET /api/customers/netsuite/read
 * @desc    Read customer langsung dari NetSuite (mirror dari "Customer (Read)" Postman)
 * @access  Protected (API Key required)
 */
router.get('/netsuite/read', verifyApiKey, controller.readFromNetSuite);

/**
 * @route   POST /api/customers/create
 * @desc    Create new customer di NetSuite dan sync ke database lokal
 * @access  Protected (API Key required)
 */
router.post('/create', verifyApiKey, controller.create);

/**
 * @route   POST /api/customers/update
 * @desc    Update customer di NetSuite dan sync ke database lokal
 * @access  Protected (API Key required)
 */
router.post('/update', verifyApiKey, controller.update);

/**
 * @route   POST /api/customers/search
 * @desc    Search customers dari NetSuite (Get Customer Page)
 * @access  Protected (API Key required)
 */
router.post('/search', verifyApiKey, controller.searchFromNetSuite);

module.exports = router;

