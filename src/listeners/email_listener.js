const fs = require('fs')
const { connectRabbitMQ } = require('../config/rabbitmq')
const {
  EXCHANGES, logger, todayFormat, mail, sendAlert
} = require('../utils')

const methodExecution = async (payload, channel) => {
  try {
    await mail.init()
      .from(payload?.email_from ?? process.env.MAIL_FROM)
      .to(payload?.email)
      .subject(payload?.subject)
      .cc(payload?.cc)
      .attachments(payload?.attachments)
      .html(payload?.template, { data: payload?.data })
      .send()

    if (payload?.attachments && payload?.attachments.length > 0) {
      for (let index = 0; index < payload?.attachments.length; index += 1) {
        fs.unlinkSync(payload?.attachments[index].path)
      }
    }
  } catch (error) {
    await sendAlert({
      job: `job email ${payload?.subject}`,
      error,
      exceptions: JSON.stringify(error),
      details: error.toString()
    })
    console.info('error email job', error)
    await channel.close()
  }
}

const initEmailServices = async () => {
  const queueName = EXCHANGES.EMAIL
  const { channel, connection } = await connectRabbitMQ()
  process.once('SIGINT', async () => {
    console.info('got sigint, closing connection')
    await channel.close()
    await connection.close()
    process.exit(0)
  })

  try {
    await channel.assertQueue(queueName, { durable: true })
    await channel.prefetch(10);
    await channel.consume(
      queueName,
      async (msg) => {
        console.info(`Processing data ${msg?.fields?.consumerTag}`)
        const parseData = JSON.parse(msg.content.toString())
        try {
          await methodExecution(parseData, channel)
          logger('email-services.txt', 'email').write(`Success consume-email-${todayFormat('YYYY-MM-DD hh:mm:ss')}: ${JSON.stringify(parseData)}}\n`)
        } catch (error) {
          console.info('error job', error)
          logger('email-services.txt', 'email').write(`Failed consume-email-${todayFormat('YYYY-MM-DD hh:mm:ss')}: ${JSON.stringify(error)}}\n`)
        }
        channel.ack(msg);
      },
      {
        noAck: false,
        consumerTag: `consumer_${queueName}`
      }
    )
  } catch (error) {
    console.info(error)
    logger('email-services.txt', 'email').write(`Error consume-email-${todayFormat('YYYY-MM-DD hh:mm:ss')}: ${error} - ${error.toString()}\n`)
  }
}

module.exports = {
  initEmailServices
}
