const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:9505';

// Exchange dan Queue names
const EXCHANGE_JOBS = 'ns.jobs';
const EXCHANGE_DLX = 'ns.dlx';
const QUEUE_PREFIX = 'ns.sync';
const RETRY_QUEUE_PREFIX = 'ns.retry';

// Retry delays (in milliseconds)
const RETRY_DELAYS = {
  1: 1000, // 1 second
  2: 10000, // 10 seconds
  3: 60000, // 1 minute
};

let connection = null;
let channel = null;

/**
 * Initialize RabbitMQ connection dan setup topology (exchanges, queues, DLX)
 */
const initializeRabbitMQ = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Setup main exchange
    await channel.assertExchange(EXCHANGE_JOBS, 'topic', { durable: true });

    // Setup DLX exchange
    await channel.assertExchange(EXCHANGE_DLX, 'direct', { durable: true });

    logger().info('RabbitMQ initialized successfully');
    return { connection, channel };
  } catch (error) {
    logger().error('Error initializing RabbitMQ:', error);
    throw error;
  }
};

/**
 * Setup queue dengan DLX dan retry queues untuk module tertentu
 */
const setupQueue = async (module) => {
  if (!channel) {
    await initializeRabbitMQ();
  }

  const mainQueue = `${QUEUE_PREFIX}.${module}`;
  const dlxQueue = `${EXCHANGE_DLX}.${module}`;
  const routingKey = `sync.${module}`;

  try {
    // Setup DLX queue
    await channel.assertQueue(dlxQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
      },
    });
    await channel.bindQueue(dlxQueue, EXCHANGE_DLX, module);

    // Setup retry queues dengan TTL
    const retryQueues = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryQueue = `${RETRY_QUEUE_PREFIX}.${module}.${attempt}`;
      const delay = RETRY_DELAYS[attempt];

      await channel.assertQueue(retryQueue, {
        durable: true,
        arguments: {
          'x-message-ttl': delay,
          'x-dead-letter-exchange': EXCHANGE_JOBS,
          'x-dead-letter-routing-key': routingKey,
        },
      });

      retryQueues.push(retryQueue);
    }

    // Setup main queue
    await channel.assertQueue(mainQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGE_DLX,
        'x-dead-letter-routing-key': module,
      },
    });

    await channel.bindQueue(mainQueue, EXCHANGE_JOBS, routingKey);

    logger().info(`Queue setup completed for module: ${module}`);
    return { mainQueue, dlxQueue, retryQueues };
  } catch (error) {
    logger().error(`Error setting up queue for ${module}:`, error);
    throw error;
  }
};

/**
 * Publish sync job ke queue
 */
const publishSyncJob = async (module, type, params, attempts = 0) => {
  if (!channel) {
    await initializeRabbitMQ();
  }

  // Setup queue jika belum ada
  await setupQueue(module);

  const jobId = uuidv4();
  const routingKey = `sync.${module}`;
  const message = {
    jobId,
    module,
    type, // 'incremental_sync', 'full_sync'
    params,
    attempts,
    timestamp: new Date().toISOString(),
  };

  try {
    const published = channel.publish(
      EXCHANGE_JOBS,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: jobId,
      }
    );

    if (published) {
      logger().info(`Published sync job: ${jobId} for module: ${module}`);
      return { jobId, message };
    } else {
      throw new Error('Channel buffer is full');
    }
  } catch (error) {
    logger().error(`Error publishing sync job for ${module}:`, error);
    throw error;
  }
};

/**
 * Publish job ke retry queue
 */
const publishToRetryQueue = async (module, message, attempt) => {
  if (!channel) {
    await initializeRabbitMQ();
  }

  const retryQueue = `${RETRY_QUEUE_PREFIX}.${module}.${attempt}`;
  
  try {
    const updatedMessage = {
      ...message,
      attempts: message.attempts + 1,
      lastRetryAt: new Date().toISOString(),
    };

    await channel.sendToQueue(
      retryQueue,
      Buffer.from(JSON.stringify(updatedMessage)),
      {
        persistent: true,
        messageId: message.jobId,
      }
    );

    logger().info(`Published job ${message.jobId} to retry queue ${retryQueue} (attempt ${updatedMessage.attempts})`);
    return updatedMessage;
  } catch (error) {
    logger().error(`Error publishing to retry queue for ${module}:`, error);
    throw error;
  }
};

/**
 * Publish job ke DLX queue
 */
const publishToDLX = async (module, message, error) => {
  if (!channel) {
    await initializeRabbitMQ();
  }

  try {
    const dlxMessage = {
      ...message,
      failedAt: new Date().toISOString(),
      error: error.message || String(error),
    };

    await channel.publish(
      EXCHANGE_DLX,
      module,
      Buffer.from(JSON.stringify(dlxMessage)),
      {
        persistent: true,
        messageId: message.jobId,
      }
    );

    logger().error(`Published job ${message.jobId} to DLX for module: ${module}`, error);
    return dlxMessage;
  } catch (err) {
    logger().error(`Error publishing to DLX for ${module}:`, err);
    throw err;
  }
};

/**
 * Get channel instance
 */
const getChannel = () => {
  return channel;
};

/**
 * Close connection
 */
const closeConnection = async () => {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
};

module.exports = {
  initializeRabbitMQ,
  setupQueue,
  publishSyncJob,
  publishToRetryQueue,
  publishToDLX,
  getChannel,
  closeConnection,
  EXCHANGE_JOBS,
  EXCHANGE_DLX,
  QUEUE_PREFIX,
  RETRY_QUEUE_PREFIX,
};

