const { publishToRabbitMqQueueSingle } = require('../config')
const { EXCHANGES } = require('./constant')

const publishData = async (options) => {
  try {
    const payloadRabbitMq = {
      data: options?.data,
      action: {
        type: options?.type,
        process: options?.queue
      }
    }
    await publishToRabbitMqQueueSingle(EXCHANGES.UPDATE_INV, EXCHANGES.UPDATE_INV, payloadRabbitMq)
    return payloadRabbitMq
  } catch (error) {
    console.error('error published', error)
    return error
  }
}

module.exports = {
  publishData
}
