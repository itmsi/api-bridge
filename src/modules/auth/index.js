const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * OAuth2 Authentication Routes
 * 
 * @route   POST /api/v1/bridge/auth/token
 * @desc    Get access token using client credentials or refresh token
 * @access  Public
 */
router.post('/token', controller.getTokenAlternative);

/**
 * @route   GET /api/v1/bridge/auth/token
 * @desc    Get access token using query parameters (alternative method)
 * @access  Public
 */
router.get('/token', controller.getTokenAlternative);

/**
 * @route   POST /api/v1/bridge/auth/revoke
 * @desc    Revoke refresh token
 * @access  Public
 */
router.post('/revoke', controller.revokeToken);

module.exports = router;

