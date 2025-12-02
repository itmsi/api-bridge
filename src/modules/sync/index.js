const express = require('express');
const router = express.Router();
const controller = require('./controller');
// const { verifyToken } = require('../../middlewares');

/**
 * @route   POST /admin/sync
 * @desc    Trigger manual sync untuk module
 * @access  Admin (add verifyToken middleware)
 */
router.post('/', controller.triggerSync);

/**
 * @route   GET /admin/sync/job/:jobId
 * @desc    Get sync job status
 * @access  Admin
 */
router.get('/job/:jobId', controller.getJobStatus);

/**
 * @route   GET /admin/sync/status/:module
 * @desc    Get sync tracker status untuk module
 * @access  Admin
 */
router.get('/status/:module', controller.getSyncStatus);

/**
 * @route   GET /admin/sync/failed
 * @desc    Get failed jobs list
 * @access  Admin
 */
router.get('/failed', controller.getFailedJobs);

/**
 * @route   POST /admin/sync/failed/:jobId/retry
 * @desc    Retry failed job
 * @access  Admin
 */
router.post('/failed/:jobId/retry', controller.retryFailedJob);

module.exports = router;

