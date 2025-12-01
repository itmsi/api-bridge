/* eslint-disable global-require */
const { HTTP, PAGE, LIMIT } = require('./constant')
const { sendAlertSlack } = require('./alert')
const { lang } = require('../lang')

let apm;
if (process.env.NODE_ENV === 'production'
    && process.env.ELASTIC_APM_DISABLED !== 'true'
    && process.env.ELASTIC_APM_ACTIVE !== 'false'
    && process.env.APM_SERVICE_URL
    && process.env.APM_SERVICE_URL !== 'disabled') {
  try {
    // eslint-disable-next-line import/no-unresolved, global-require
    apm = require('elastic-apm-node').start({
      // Override the service name from package.json
      // Allowed characters: a-z, A-Z, 0-9, -, _, and space
      serviceName: process.env.APM_SERVICE_NAME || 'core-api-msi',
      // Use if APM Server requires a secret token
      secretToken: process.env.APM_SERVICE_TOKEN,
      // Set the custom APM Server URL (default: http://localhost:8200)
      serverUrl: process.env.APM_SERVICE_URL,
      verifyServerCert: false,
      // Set the service environment
      environment: process.env.NODE_ENV,
      // Add centralConfig: false option
      centralConfig: false
    });
  } catch (error) {
    console.log('APM initialization failed:', error.message);
    apm = null;
  }
} else {
  console.log('APM is disabled or not configured');
  apm = null;
}

const notFoundHandler = (req, res) => {
  const message = `Route : ${req.url} ${lang.__('not.found')}.`
  const err = new Error(message)
  res.status(HTTP.OK).json({
    error: err.toString(),
    status: true,
    message,
  })
}

const removeFavicon = (req, res, next) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' })
    res.end()
  } else {
    next()
  }
}

const errorHandler = (error, res) => {
  sendAlertSlack({
    alert_type: 'exception',
    messages: `syntax error ${error}`,
    errors: error,
    exceptions: error.toString()
  }).then((r) => {
    console.log('success sending', r)
  }).catch((err) => {
    console.log('error sending', err)
  })
  res.status(HTTP.OK).json({
    status: true,
    message: lang.__('error.invalid.syntax'),
    data: [],
  })
}

const syntaxError = (err, req, res, next) => {
  const result = {
    status: true,
    message: `syntax error ${err}`,
    data: []
  }

  if (err instanceof SyntaxError) {
    if (process.env.NODE_ENV === 'development') {
      console.info(err.toString())
    } else {
      // sent to sentry or whatever
      console.info(err.toString())
      sendAlertSlack({
        alert_type: 'exception',
        messages: `syntax error ${err}`,
        errors: err,
        exceptions: err.toString()
      }).then((r) => {
        console.log('success sending', r)
      }).catch((error) => {
        console.log('error sending', error)
      })
    }
    return res.status(HTTP.OK).send(result)
  }
  return next()
}

const paginationResponse = (req, res, rows) => {
  const limitPerPage = req.query?.limit || LIMIT
  const countTotal = Number(rows?.data?.response?.count) || 0
  res.status(HTTP.OK).json({
    message: lang.__('get.success'),
    status: true,
    data: rows?.data?.response?.result || [],
    _meta: {
      page: Number(req.query?.page) || +PAGE,
      limit_per_page: +limitPerPage,
      total_page: Math.ceil(countTotal / limitPerPage),
      count_per_page: rows?.data?.response?.result?.length || 0,
      count_total: countTotal
    }
  })
}

const paginationResponsePublic = (req, res, rows) => {
  res.status(HTTP.OK).json({
    message: lang.__('get.success'),
    status: true,
    data: rows?.data?.response?.result || []
  })
}

const originResponse = (res, status, data) => {
  let code
  switch (status) {
    case 'success':
      code = HTTP.OK
      break
    case 'created':
      code = HTTP.OK
      break
    case 'not found':
      code = HTTP.OK
      break
    case 'unauthorized':
      code = HTTP.OK
      break
    default:
      code = HTTP.OK
  }
  res.status(code).json(data)
}

const baseResponse = (res, data) => res.status(data?.code ?? HTTP.OK).json(data?.data)

const baseResponseGeneral = (res, data) => res.status(data?.code ?? HTTP.OK).json(data)

const mappingSuccessPagination = (message, response = [], code = HTTP.OK, status = true) => ({
  code,
  data: {
    status,
    message,
    response
  }
})

const mappingSuccess = (message, data = [], code = HTTP.OK, status = true) => ({
  code,
  data: {
    status,
    message,
    data
  }
})

const mappingErrorValidation = (error, code = HTTP.CREATED) => {
  let { message, exception } = ['', '']
  message = error
  console.error('catch message', error);
  if (process.env.NODE_ENV === 'development') {
    exception = error.toString()
  }
  return {
    code,
    data: {
      status: false,
      message,
      exception,
      data: []
    }
  }
}

const mappingError = (error, code = HTTP.CREATED) => {
  let { message, exception } = ['', '']
  const manipulate = error.toString().split(':')
  switch (manipulate[0] || 'Unknown') {
    case 'JsonWebTokenError':
      message = error
      break
    case 'Error':
      message = lang.__('error.db.connection')
      break
    case 'error':
      message = lang.__('error.db')
      break
    case 'TypeError':
      message = `error in code ${manipulate.toString()}`
      break
    case 'AggregateError':
      message = lang.__('error.db.query')
      break
    case 'ReferenceError':
      message = manipulate.toString()
      break
    default:
      message = error
  }
  console.error('catch message', error);
  if (process.env.NODE_ENV === 'development') {
    exception = error.toString()
  }
  if (process.env.NODE_ENV === 'production' && apm) {
    apm.captureError(error);
  }
  console.log(manipulate[0] || 'Unknown');
  sendAlertSlack({
    alert_type: 'exception',
    messages: message,
    errors: error,
    exceptions: error.toString(),
    path_error: error?.path ?? __filename
  }).then((r) => {
    console.log('success sending', r)
  }).catch((errs) => {
    console.log('error sending', errs)
  })
  return {
    code,
    data: {
      status: false,
      message,
      exception,
      data: []
    }
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  baseResponse,
  paginationResponse,
  paginationResponsePublic,
  removeFavicon,
  syntaxError,
  originResponse,
  mappingErrorValidation,
  mappingSuccess,
  mappingError,
  mappingSuccessPagination,
  baseResponseGeneral,
}
