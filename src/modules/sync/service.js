const repository = require('./repository');
const { publishSyncJob } = require('../../utils/rabbitmq-sync');
const { Logger } = require('../../utils/logger');

/**
 * Service layer untuk business logic Sync
 */

/**
 * Trigger manual sync
 */
const triggerSync = async (module, since, type = 'incremental_sync') => {
  if (!module) {
    throw new Error('Module is required');
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

  return {
    jobId,
    module,
    status: 'pending',
    params: job.params,
  };
};

/**
 * Get sync job status
 */
const getJobStatus = async (jobId) => {
  return await repository.getSyncJob(jobId);
};

/**
 * Get sync tracker status untuk module
 */
const getSyncStatus = async (module) => {
  return await repository.getSyncTracker(module);
};

/**
 * Get failed jobs
 */
const getFailedJobs = async (module, page = 1, limit = 50) => {
  return await repository.getFailedJobs(module, page, limit);
};

/**
 * Retry failed job
 */
const retryFailedJob = async (jobId) => {
  // Get failed job
  const failedJob = await repository.getFailedJob(jobId);

  if (!failedJob) {
    return null;
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

  return {
    jobId: newJobId,
    previousJobId: jobId,
    module: failedJob.module,
  };
};

module.exports = {
  triggerSync,
  getJobStatus,
  getSyncStatus,
  getFailedJobs,
  retryFailedJob,
};

