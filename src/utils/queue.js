const amqplib = require('amqplib');
const amqplibCb = require('amqplib/callback_api');
const config = require('../config/queue');
const { logger } = require('./logger')

const queueConsumer = async (channelQueue, callback) => {
  try {
    amqplibCb.connect(`${process.env.RABBITMQ_URL}?heartbeat=60`, (err, connection) => {
      if (err) {
        console.error(err.stack);
      }

      connection.createChannel((errs, channel) => {
        if (errs) {
          console.error(errs.stack);
        }

        channel.assertQueue(channelQueue, {
          durable: true,
        }, (errAssert) => {
          if (errAssert) {
            console.error(errAssert.stack);
          }

          channel.prefetch(1);

          channel.consume(channelQueue, async (data) => {
            if (data === null) {
              return;
            }

            const message = JSON.parse(data.content.toString());
            callback({ data, channel, message })
          });
        });
      });
    });
  } catch (error) {
    console.error('error in connection rabbitmq', error);
  }
}
const queue = async (channel, data) => {
  try {
    const Queue = channel;
    const conn = await amqplib.connect(`${config.amqp}?heartbeat=60`);

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(Queue);

    const ch2 = await conn.createChannel();

    let setData = '';
    if (typeof data === 'string') {
      setData = data
    } else {
      setData = JSON.stringify(data)
    }
    ch2.sendToQueue(Queue, Buffer.from(setData));
    logger('queue.txt', 'queue').write(`[QUEUED]Channel: ${queue}, Data: ${setData}.\n`)
  } catch (error) {
    console.error('error in queue function', error);
  }
};

const queueConsumerEmail = (channelQueue) => {
  queueConsumer(channelQueue, async ({ data, channel, message }) => {
    // eslint-disable-next-line global-require
    const mail = require('./mail');
    const send = await mail.init()
      .from(message.from)
      .to(message.to)
      .subject(message.subject)
      .html(message.html.view, message.html.variable)
      .text(message.text)
      .config(message.config)
      .send();

    if (send.status) {
      channel.ack(data);
      console.log({ channel: channelQueue, status: true, to: message.to })
      logger('queue.txt', 'queue').write(`[CONSUME][SUCCESS]Channel: ${channelQueue}, Data: ${message}.\n`)
    } else {
      channel.nack(data);
      console.log({
        channel: channelQueue, status: false, to: message.to, message: send.message
      })
      logger('queue.txt', 'queue').write(`[CONSUME][FAILED]Channel: ${channelQueue}, Data: ${message}, Message: ${send.message}.\n`)
    }
  })
}

module.exports = {
  queue,
  queueConsumer,
  queueConsumerEmail,
}
