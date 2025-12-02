const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');

/**
 * Controller layer untuk HTTP request/response handling Sync
 */

/**
 * Trigger manual sync
 */
const triggerSync = async (req, res) => {
  try {
    const { module, since, type = 'incremental_sync' } = req.body;

    const result = await service.triggerSync(module, since, type);
    return baseResponse(res, result, 'Sync job telah di-trigger', 202);
  } catch (error) {
    if (error.message === 'Module is required') {
      return errorResponse(res, { message: error.message }, 400);
    }
    return errorResponse(res, error);
  }
};

/**
 * Get sync job status
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await service.getJobStatus(jobId);

    if (!job) {
      return emptyDataResponse(res, 1, 0, false);
    }

    return baseResponse(res, job);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get sync tracker status untuk module
 */
const getSyncStatus = async (req, res) => {
  try {
    const { module } = req.params;
    const tracker = await service.getSyncStatus(module);

    if (!tracker) {
      return emptyDataResponse(res, 1, 0, false);
    }

    return baseResponse(res, tracker);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get failed jobs
 */
const getFailedJobs = async (req, res) => {
  try {
    const { module, page = 1, limit = 50 } = req.query;
    const data = await service.getFailedJobs(module, page, limit);

    // Check if data is empty
    if (!data || !data.items || (Array.isArray(data.items) && data.items.length === 0)) {
      return emptyDataResponse(res, page, limit, true);
    }

    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Retry failed job
 */
const retryFailedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await service.retryFailedJob(jobId);

    if (!result) {
      return emptyDataResponse(res, 1, 0, false);
    }

    return baseResponse(res, result, 'Job telah di-retry', 202);
  } catch (error) {
    return errorResponse(res, error);
  }
};

module.exports = {
  triggerSync,
  getJobStatus,
  getSyncStatus,
  getFailedJobs,
  retryFailedJob,
};

