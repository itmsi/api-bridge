/**
 * Server Entry Point
 * Handles process events and starts the Express application
 */
const app = require('./app')

process.on('warning', (warning) => {
  console.warn(warning.name)
  console.warn(warning.message)
  console.warn(warning.stack)
})

const unhandledRejections = new Map()
process.on('unhandledRejection', (reason, promise) => {
  unhandledRejections.set(promise, reason)
  console.log(
    process.stderr.fd,
    `Caught rejection: ${promise}\n`
    + `Exception reason: ${reason}`
  )
})
process.on('rejectionHandled', (promise) => {
  unhandledRejections.delete(promise)
})

process.on('uncaughtException', (err, origin) => {
  console.log(
    process.stderr.fd,
    `Caught exception: ${err}\n`
    + `Exception origin: ${origin}`
  )
})

process.on('SIGTERM', () => {
  console.info('SIGTERM received')
})

const PORT = process.env.APP_PORT || 9575;
const APP_NAME = process.env.APP_NAME || 'API Bridge';

app.listen(PORT, () => {
  if (process.env.NODE_ENV === 'development') {
    console.info(`${APP_NAME} running in port ${PORT}`);
    console.info(`API Documentation: http://localhost:${PORT}/documentation`);
  } else {
    console.info(`${APP_NAME} is running on port ${PORT}`);
  }
});
