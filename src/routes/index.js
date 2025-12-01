const express = require('express')
const swaggerUi = require('swagger-ui-express')
const { baseResponse, fullDateFormatIndo } = require('../utils')
const { register } = require('../config/prometheus')

const router = express.Router()
const { index } = require('../static')

const getDurationInMilliseconds = (start = process.hrtime()) => {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}

router.get('/', (req, res) => {
  baseResponse(res, {
    data: {
      response_time: `${getDurationInMilliseconds()}(ms)`,
      welcome: process?.env?.APP_NAME,
      uptimes: process.uptime(),
      timestamp: fullDateFormatIndo(new Date().toISOString()),
      documentation: process?.env?.SWAGGER_ENABLED === 'true' ? `http://${req.get('host')}/documentation` : 'Swagger documentation is disabled'
    }
  })
})

// Swagger configuration - can be controlled via SWAGGER_ENABLED environment variable
// Options:
// - SWAGGER_ENABLED=true (always enabled)
// - SWAGGER_ENABLED=false (always disabled)
// - SWAGGER_ENABLED=development (only in development mode)
// - SWAGGER_ENABLED not set (defaults to development mode only)

const isSwaggerEnabled = () => {
  const swaggerEnabled = process?.env?.SWAGGER_ENABLED

  if (swaggerEnabled === 'true') return true
  if (swaggerEnabled === 'false') return false
  if (swaggerEnabled === 'development') return process?.env?.NODE_ENV === 'development'

  // Default behavior (backward compatibility)
  return process?.env?.NODE_ENV === 'development'
}

// Prometheus metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType)
    const metrics = await register.metrics()
    res.end(metrics)
  } catch (ex) {
    res.status(500).end(ex)
  }
})

if (isSwaggerEnabled()) {
  router.use('/documentation', swaggerUi.serve)
  router.get('/documentation', swaggerUi.setup(index, { isExplorer: false }))
}

module.exports = router
