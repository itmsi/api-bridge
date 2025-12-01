require('dotenv').config();
const { startCustomerSyncWorker } = require('../job/customer_sync_worker');
const { logger } = require('../utils/logger');

const start = async () => {
  try {
    logger().info('Starting API Bridge Consumers...');

    // Start customer sync worker
    await startCustomerSyncWorker();

    // Tambahkan worker lainnya di sini jika diperlukan
    // await startProductSyncWorker();
    // await startOrderSyncWorker();

    logger().info('All consumers started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger().info('SIGTERM received, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger().info('SIGINT received, shutting down gracefully...');
      process.exit(0);
    });
  } catch (error) {
    logger().error('Failed to start consumers:', error);
    process.exit(1);
  }
};

start();
