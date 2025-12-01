const express = require('express')

require('dotenv').config()

const app = express()
const compress = require('compression')
const methodOverride = require('method-override')
const xss = require('xss-clean')
const morgan = require('morgan')
const {
  notFoundHandler,
  errorHandler,
  removeFavicon,
  MORGAN_FORMAT,
  syntaxError,
} = require('./utils')

const healthCheck = require('./routes')
const apiV1 = require('./routes/V1')
const { initListener } = require('./listeners')
const { prometheusMiddleware } = require('./middlewares/prometheus')
const { connectRedis } = require('./config/redis')

// Initialize Redis connection
if (process.env.REDIS_ENABLED === 'true') {
  console.log('Initializing Redis connection...')
  connectRedis().catch((err) => {
    console.error('Failed to connect to Redis:', err)
    // Continue without Redis - cache will be disabled
  })
} else {
  console.log('Redis not enabled, skipping connection')
}

// Conditionally initialize listeners only if RabbitMQ is enabled
if (process.env.RABBITMQ_ENABLED === 'true' && process.env.RABBITMQ_URL && process.env.RABBITMQ_URL !== 'disabled') {
  console.log('Initializing RabbitMQ listeners...')
  initListener()
} else {
  console.log('RabbitMQ not enabled or configured, skipping listener initialization')
}

const limit = process.env.JSON_LIMIT || '1gb'
app.set('trust proxy', 1);
app.use(compress()) // gzip compression
app.use(methodOverride()) // lets you use HTTP verbs
app.use(xss()) // handler xss attack
app.use(express.json({ limit })) // json limit
app.use(express.urlencoded({ limit, extended: true })) // urlencoded limit
if (process.env.NODE_ENV === 'production') {
  app.use(morgan(MORGAN_FORMAT.PROD))
} else {
  app.use(morgan(MORGAN_FORMAT.DEV, { stream: process.stderr }))
}

// Prometheus monitoring middleware
app.use(prometheusMiddleware)

app.use(healthCheck) // routing
app.use(apiV1) // routing
app.use('/public', express.static('public')) // for public folder
app.use(notFoundHandler) // 404 handler
app.use(errorHandler) // error handlerr
app.use(syntaxError) // error handlerr syntax
app.use(removeFavicon)

module.exports = app
