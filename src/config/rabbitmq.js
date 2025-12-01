const amqp = require('amqplib');
const { lang } = require('../lang');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:9505';

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    return { connection, channel };
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    throw error;
  }
};

const publishToRabbitMqQueueSingle = async (exchangeName, queueName, data) => {
  const config = await connectRabbitMQ()

  try {
    if (config?.connection && config?.channel) {
      await config?.channel.assertExchange(exchangeName, 'fanout', { durable: true })
      await config?.channel.assertQueue(queueName, { durable: true })
      await config?.channel.bindQueue(queueName, exchangeName)

      config?.channel.publish(exchangeName, '', Buffer.from(JSON.stringify(data)))
      console.info(lang.__('rabbitmq.publish'))
    } else {
      console.info(`failed to publish ${exchangeName} - ${queueName}`, config?.error)
    }
  } catch (e) {
    console.error(lang.__('rabbitmq.error'), e)
  } finally {
    console.info(lang.__('rabbitmq.closing'))
    await config?.channel.close()
    await config?.connection.close()
    console.info(lang.__('rabbitmq.closed'))
  }
}

module.exports = {
  connectRabbitMQ,
  publishToRabbitMqQueueSingle
}
