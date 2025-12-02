const db = require('../../config/database');

const SYNC_TRACKER_TABLE = 'sync_tracker';
const SYNC_JOBS_TABLE = 'sync_jobs';
const FAILED_JOBS_TABLE = 'failed_jobs';

/**
 * Repository layer untuk database operations Sync
 */

/**
 * Sync Tracker Repository
 */

/**
 * Get sync tracker untuk module tertentu
 */
const getSyncTracker = async (module) => {
  return await db(SYNC_TRACKER_TABLE)
    .where({ module })
    .first();
};

/**
 * Create atau update sync tracker
 */
const upsertSyncTracker = async (module, data) => {
  const existing = await db(SYNC_TRACKER_TABLE)
    .where({ module })
    .first();

  const now = new Date();

  if (existing) {
    const [updated] = await db(SYNC_TRACKER_TABLE)
      .where({ module })
      .update({
        ...data,
        updated_at: now,
      })
      .returning('*');
    return updated;
  } else {
    const [created] = await db(SYNC_TRACKER_TABLE)
      .insert({
        module,
        ...data,
        created_at: now,
        updated_at: now,
      })
      .returning('*');
    return created;
  }
};

/**
 * Sync Jobs Repository
 */

/**
 * Create sync job
 */
const createSyncJob = async (jobData) => {
  const [created] = await db(SYNC_JOBS_TABLE)
    .insert({
      ...jobData,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return created;
};

/**
 * Get sync job by job_id
 */
const getSyncJob = async (jobId) => {
  return await db(SYNC_JOBS_TABLE)
    .where({ job_id: jobId })
    .first();
};

/**
 * Update sync job
 */
const updateSyncJob = async (jobId, updateData) => {
  const [updated] = await db(SYNC_JOBS_TABLE)
    .where({ job_id: jobId })
    .update({
      ...updateData,
      updated_at: new Date(),
    })
    .returning('*');
  return updated;
};

/**
 * Update sync job status
 */
const updateSyncJobStatus = async (jobId, status, error = null) => {
  const updateData = {
    status,
    updated_at: new Date(),
  };

  if (status === 'processing') {
    updateData.started_at = new Date();
  } else if (status === 'success' || status === 'failed') {
    updateData.completed_at = new Date();
  }

  if (error) {
    updateData.last_error = error;
  }

  const [updated] = await db(SYNC_JOBS_TABLE)
    .where({ job_id: jobId })
    .update(updateData)
    .returning('*');
  return updated;
};

/**
 * Increment sync job attempts
 */
const incrementSyncJobAttempts = async (jobId) => {
  const job = await getSyncJob(jobId);
  if (job) {
    const [updated] = await db(SYNC_JOBS_TABLE)
      .where({ job_id: jobId })
      .update({
        attempts: db.raw('attempts + 1'),
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }
  return null;
};

/**
 * Update sync tracker status
 */
const updateSyncTrackerStatus = async (module, status, remark = null) => {
  return await upsertSyncTracker(module, { status, remark });
};

/**
 * Failed Jobs Repository
 */

/**
 * Create failed job
 */
const createFailedJob = async (jobId, module, payload, error, stackTrace, attempts) => {
  const [created] = await db(FAILED_JOBS_TABLE)
    .insert({
      job_id: jobId,
      module,
      payload,
      error: error.message || String(error),
      stack_trace: stackTrace,
      attempts,
      created_at: new Date(),
    })
    .returning('*');
  return created;
};

/**
 * Get failed job by job_id
 */
const getFailedJob = async (jobId) => {
  return await db(FAILED_JOBS_TABLE)
    .where({ job_id: jobId })
    .first();
};

/**
 * Get all failed jobs dengan pagination
 */
const getFailedJobs = async (module = null, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  let query = db(FAILED_JOBS_TABLE)
    .select('*')
    .orderBy('created_at', 'desc');

  if (module) {
    query = query.where({ module });
  }

  const data = await query
    .limit(limit)
    .offset(offset);
    
  const totalResult = await db(FAILED_JOBS_TABLE)
    .modify((queryBuilder) => {
      if (module) {
        queryBuilder.where({ module });
      }
    })
    .count('id as count')
    .first();
    
  const total = totalResult?.count ? parseInt(totalResult.count) : 0;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    
  return {
    items: data || [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: totalPages
    }
  };
};

/**
 * Delete failed job
 */
const deleteFailedJob = async (jobId) => {
  return await db(FAILED_JOBS_TABLE)
    .where({ job_id: jobId })
    .del();
};

module.exports = {
  // Sync Tracker
  getSyncTracker,
  upsertSyncTracker,
  updateSyncTrackerStatus,
  // Sync Jobs
  createSyncJob,
  getSyncJob,
  updateSyncJob,
  updateSyncJobStatus,
  incrementSyncJobAttempts,
  // Failed Jobs
  createFailedJob,
  getFailedJob,
  getFailedJobs,
  deleteFailedJob,
};

