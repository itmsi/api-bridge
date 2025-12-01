const amqp = require('amqplib');
const { logger } = require('../utils/logger');
const { initializeRabbitMQ, setupQueue, getChannel, publishToRetryQueue, publishToDLX } = require('../utils/rabbitmq-sync');
const customerRepository = require('../modules/customer/postgre_repository');
const syncRepository = require('../modules/sync/postgre_repository');
const { deleteCache, CACHE_KEYS, deleteCacheByPattern } = require('../utils/cache');
const { getNetSuiteCustomerService } = require('../services/netsuite/customer-service');
const { metrics } = require('../config/prometheus');

const MODULE = 'customer';
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Fetch customers dari NetSuite menggunakan NetSuite Customer Service
 */
const fetchNetSuiteCustomers = async (params) => {
  const { since, page = 1, pageSize = 500, netsuite_id } = params;

  try {
    const customerService = getNetSuiteCustomerService();
    
    // Track request start time
    const startTime = Date.now();
    
    // Search customers dari NetSuite
    const response = await customerService.searchCustomers({
      since,
      page,
      pageSize,
      netsuite_id,
    });

    // Calculate duration
    const duration = (Date.now() - startTime) / 1000;

    // Track metrics
    metrics.sync.syncDuration.observe(
      { module: MODULE, type: 'incremental_sync' },
      duration
    );

    logger().info(`Fetched ${response.items.length} customers from NetSuite`, {
      page,
      pageSize,
      hasMore: response.hasMore,
      totalResults: response.totalResults,
      duration,
    });

    return response;
  } catch (error) {
    logger().error('Error fetching customers from NetSuite:', error);
    throw error;
  }
};

/**
 * Process incremental sync untuk customer
 */
const processIncrementalSync = async (params) => {
  const { since, page = 1, pageSize = 500, netsuite_id } = params;
  
  logger().info(`Processing incremental sync for customer:`, params);

  try {
    // Update sync tracker status
    await syncRepository.updateSyncTrackerStatus(MODULE, 'syncing', 'Processing incremental sync');

    let currentPage = page;
    let hasMore = true;
    let maxLastModified = since ? new Date(since) : null;
    let totalProcessed = 0;

    // Loop through pages
    while (hasMore) {
      const response = await fetchNetSuiteCustomers({
        since,
        page: currentPage,
        pageSize,
        netsuite_id,
      });

      if (!response.items || response.items.length === 0) {
        hasMore = false;
        break;
      }

      // Response sudah dalam format yang benar dari service
      // items sudah di-transform oleh customerService.transformCustomerData()
      const customers = response.items;

      // Batch upsert ke database
      await customerRepository.batchUpsert(customers);

      // Update max last modified
      for (const customer of customers) {
        const customerDate = new Date(customer.last_modified_netsuite);
        if (!maxLastModified || customerDate > maxLastModified) {
          maxLastModified = customerDate;
        }
      }

      // Invalidate cache untuk customers yang di-update
      for (const customer of customers) {
        await deleteCache(CACHE_KEYS.CUSTOMER(customer.netsuite_id));
      }

      // Invalidate list cache
      await deleteCacheByPattern('customer:list:*');

      totalProcessed += customers.length;

      // Check if has more pages
      hasMore = response.hasMore === true;
      if (hasMore) {
        currentPage++;
      }

      logger().info(`Processed page ${currentPage - 1}: ${customers.length} customers`);
    }

    // Update sync tracker
    await syncRepository.upsertSyncTracker(MODULE, {
      last_sync_at: new Date(),
      last_synced_batch_max: maxLastModified,
      status: 'success',
      remark: `Processed ${totalProcessed} customers`,
    });

    logger().info(`Incremental sync completed: ${totalProcessed} customers processed`);
    
    // Track success metrics
    metrics.sync.syncJobsProcessed.inc({ module: MODULE, status: 'success' });
    
    return { success: true, totalProcessed, maxLastModified };
  } catch (error) {
    logger().error('Error processing incremental sync:', error);
    await syncRepository.updateSyncTrackerStatus(MODULE, 'failed', error.message);
    
    // Track failure metrics
    metrics.sync.syncJobsFailed.inc({ module: MODULE });
    
    throw error;
  }
};

/**
 * Process sync job
 */
const processSyncJob = async (message) => {
  const { jobId, module, type, params, attempts } = message;

  logger().info(`Processing sync job: ${jobId}`, { module, type, params, attempts });

  try {
    // Update job status to processing
    await syncRepository.updateSyncJobStatus(jobId, 'processing');

    if (module !== MODULE) {
      throw new Error(`Unsupported module: ${module}`);
    }

    if (type === 'incremental_sync') {
      const result = await processIncrementalSync(params);
      await syncRepository.updateSyncJobStatus(jobId, 'success');
      return result;
    } else {
      throw new Error(`Unsupported sync type: ${type}`);
    }
  } catch (error) {
    logger().error(`Error processing sync job ${jobId}:`, error);

    // Increment attempts
    await syncRepository.incrementSyncJobAttempts(jobId);

    // Check if should retry
    if (attempts < MAX_RETRY_ATTEMPTS) {
      // Publish to retry queue
      await publishToRetryQueue(module, message, attempts + 1);
      await syncRepository.updateSyncJobStatus(jobId, 'pending', `Retrying (attempt ${attempts + 1})`);
    } else {
      // Max attempts reached, send to DLX
      await publishToDLX(module, message, error);
      
      // Create failed job record
      await syncRepository.createFailedJob(
        jobId,
        module,
        { type, params },
        error,
        error.stack,
        attempts + 1
      );

      await syncRepository.updateSyncJobStatus(jobId, 'failed', error.message);
    }

    throw error;
  }
};

/**
 * Start customer sync worker
 */
const startCustomerSyncWorker = async () => {
  try {
    logger().info('Starting customer sync worker...');

    // Initialize RabbitMQ
    await initializeRabbitMQ();

    // Setup queue
    const { mainQueue } = await setupQueue(MODULE);
    const channel = getChannel();

    // Set prefetch to limit concurrent messages
    await channel.prefetch(1);

    logger().info(`Consuming from queue: ${mainQueue}`);

    // Consume messages
    await channel.consume(mainQueue, async (msg) => {
      if (!msg) {
        return;
      }

      try {
        const message = JSON.parse(msg.content.toString());
        logger().info(`Received sync job: ${message.jobId}`);

        await processSyncJob(message);

        // Acknowledge message
        channel.ack(msg);
        logger().info(`Job ${message.jobId} completed successfully`);
      } catch (error) {
        logger().error('Error processing message:', error);

        // Nack message (don't requeue, let DLX handle it)
        channel.nack(msg, false, false);
      }
    });

    logger().info('Customer sync worker started successfully');
  } catch (error) {
    logger().error('Error starting customer sync worker:', error);
    throw error;
  }
};

module.exports = {
  startCustomerSyncWorker,
  processSyncJob,
  processIncrementalSync,
};

