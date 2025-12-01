const repository = require('./postgre_repository');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { publishSyncJob } = require('../../utils/rabbitmq-sync');
const { Logger } = require('../../utils/logger');

/**
 * Trigger manual sync
 */
const triggerSync = async (req, res) => {
  try {
    const { module, since, type = 'incremental_sync' } = req.body;

    if (!module) {
      return errorResponse(res, { message: 'Module is required' }, 400);
    }

    // Get sync tracker untuk mendapatkan last sync time jika since tidak diberikan
    let sinceDate = since;
    if (!sinceDate) {
      const tracker = await repository.getSyncTracker(module);
      sinceDate = tracker?.last_sync_at || tracker?.last_synced_batch_max || null;
    }

    // Publish sync job
    const { jobId } = await publishSyncJob(module, type, {
      since: sinceDate,
      page: 1,
      pageSize: 500,
    });

    // Create job record
    const job = await repository.createSyncJob({
      job_id: jobId,
      module,
      params: {
        since: sinceDate,
        page: 1,
        pageSize: 500,
        type,
      },
      status: 'pending',
      attempts: 0,
    });

    Logger.info(`Manual sync triggered for module ${module}, jobId: ${jobId}`);

    return baseResponse(res, {
      jobId,
      module,
      status: 'pending',
      params: job.params,
    }, 'Sync job telah di-trigger', 202);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get sync job status
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await repository.getSyncJob(jobId);

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

    const tracker = await repository.getSyncTracker(module);

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

    const data = await repository.getFailedJobs(module, page, limit);

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

    // Get failed job
    const failedJob = await repository.getFailedJob(jobId);

    if (!failedJob) {
      return emptyDataResponse(res, 1, 0, false);
    }

    // Publish job kembali
    const { jobId: newJobId } = await publishSyncJob(
      failedJob.module,
      failedJob.payload?.type || 'incremental_sync',
      failedJob.payload?.params || {}
    );

    // Create new job record
    const job = await repository.createSyncJob({
      job_id: newJobId,
      module: failedJob.module,
      params: failedJob.payload?.params || {},
      status: 'pending',
      attempts: 0,
    });

    return baseResponse(res, {
      jobId: newJobId,
      previousJobId: jobId,
      module: failedJob.module,
    }, 'Job telah di-retry', 202);
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

