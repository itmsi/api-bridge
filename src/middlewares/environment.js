/**
 * Environment Middleware
 * Attach environment context (sandbox/production) ke request
 * Environment ditentukan berdasarkan port yang digunakan
 */

const { getEnvironmentByPort, environmentContext } = require('../utils/environment');

/**
 * Middleware untuk attach environment context ke request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const environmentMiddleware = (req, res, next) => {
  // Get port dari request
  const port = req.socket?.localPort || req.connection?.localPort || process.env.APP_PORT || process.env.PORT;
  
  // Determine environment berdasarkan port
  const environment = getEnvironmentByPort(port);
  
  // Attach environment ke request object
  req.environment = environment;
  req.isSandbox = environment === 'sandbox';
  req.isProduction = environment === 'production';
  
  // Attach ke response locals juga untuk akses di views/templates
  res.locals.environment = environment;
  res.locals.isSandbox = req.isSandbox;
  res.locals.isProduction = req.isProduction;
  
  // Store environment di AsyncLocalStorage untuk akses dari repository/service
  environmentContext.run({ environment }, () => {
    next();
  });
};

module.exports = {
  environmentMiddleware,
};

