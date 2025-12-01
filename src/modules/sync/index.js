const express = require('express');
const router = express.Router();
const handler = require('./handler');
// const { verifyToken } = require('../../middlewares');

/**
 * @route   POST /admin/sync
 * @desc    Trigger manual sync untuk module
 * @access  Admin (add verifyToken middleware)
 */
router.post('/', handler.triggerSync);

/**
 * @route   GET /admin/sync/job/:jobId
 * @desc    Get sync job status
 * @access  Admin
 */
router.get('/job/:jobId', handler.getJobStatus);

/**
 * @route   GET /admin/sync/status/:module
 * @desc    Get sync tracker status untuk module
 * @access  Admin
 */
router.get('/status/:module', handler.getSyncStatus);

/**
 * @route   GET /admin/sync/failed
 * @desc    Get failed jobs list
 * @access  Admin
 */
router.get('/failed', handler.getFailedJobs);

/**
 * @route   POST /admin/sync/failed/:jobId/retry
 * @desc    Retry failed job
 * @access  Admin
 */
router.post('/failed/:jobId/retry', handler.retryFailedJob);

module.exports = router;

