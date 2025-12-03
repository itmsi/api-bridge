const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyOAuth2Token } = require('../../middlewares');

/**
 * @route   POST /api/vendors/get
 * @desc    Get all vendors with pagination dan filtering
 * @access  Protected (OAuth2 Access Token required)
 */
router.post('/get', verifyOAuth2Token, controller.getAll);

/**
 * @route   GET /api/vendors/:id
 * @desc    Get vendor by ID
 * @access  Protected (OAuth2 Access Token required)
 */
router.get('/:id', verifyOAuth2Token, controller.getById);

/**
 * @route   GET /api/vendors/netsuite/:netsuite_id
 * @desc    Get vendor by NetSuite ID
 * @access  Protected (OAuth2 Access Token required)
 */
router.get('/netsuite/:netsuite_id', verifyOAuth2Token, controller.getByNetSuiteId);

/**
 * @route   POST /api/vendors/search
 * @desc    Search vendors dari NetSuite (Get Vendor Page)
 * @access  Protected (OAuth2 Access Token required)
 */
router.post('/search', verifyOAuth2Token, controller.searchFromNetSuite);

module.exports = router;

