const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyOAuth2Token } = require('../../middlewares');

/**
 * @route   POST /api/customers/get
 * @desc    Get all customers with pagination dan filtering
 * @access  Protected (OAuth2 Access Token required)
 */
router.post('/get', verifyOAuth2Token, controller.getAll);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Protected (OAuth2 Access Token required)
 */
router.get('/:id', verifyOAuth2Token, controller.getById);

/**
 * @route   GET /api/customers/netsuite/:netsuite_id
 * @desc    Get customer by NetSuite ID (dengan on-demand sync)
 * @access  Protected (OAuth2 Access Token required)
 */
router.get('/netsuite/:netsuite_id', verifyOAuth2Token, controller.getByNetSuiteId);

/**
 * @route   GET /api/customers/netsuite/read
 * @desc    Read customer langsung dari NetSuite (mirror dari "Customer (Read)" Postman)
 * @access  Protected (OAuth2 Access Token required)
 */
router.get('/netsuite/read', verifyOAuth2Token, controller.readFromNetSuite);

/**
 * @route   POST /api/customers/create
 * @desc    Create new customer di NetSuite dan sync ke database lokal
 * @access  Protected (OAuth2 Access Token required)
 */
router.post('/create', verifyOAuth2Token, controller.create);

/**
 * @route   POST /api/customers/update
 * @desc    Update customer di NetSuite dan sync ke database lokal
 * @access  Protected (OAuth2 Access Token required)
 */
router.post('/update', verifyOAuth2Token, controller.update);

/**
 * @route   POST /api/customers/search
 * @desc    Search customers dari NetSuite (Get Customer Page)
 * @access  Protected (OAuth2 Access Token required)
 */
router.post('/search', verifyOAuth2Token, controller.searchFromNetSuite);

module.exports = router;

