const { metrics } = require('../config/prometheus');

/**
 * Middleware untuk tracking HTTP requests dengan Prometheus
 * Mengumpulkan metrics untuk duration, total requests, dan request size
 */
const prometheusMiddleware = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // Hook untuk mengukur response size
  let responseSize = 0;
  res.send = function(data) {
    responseSize = Buffer.byteLength(data, 'utf8');
    return originalSend.call(this, data);
  };
  
  // Hook untuk mengukur duration dan status code saat response selesai
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // convert to seconds
    const route = req.route ? req.route.path : 'unknown';
    
    // Increment total requests
    metrics.httpRequestTotal.inc({
      method: req.method,
      route: route,
      status: res.statusCode.toString(),
    });
    
    // Record request duration
    metrics.httpRequestDuration.observe({
      method: req.method,
      route: route,
      status: res.statusCode.toString(),
    }, duration);
    
    // Record request size
    if (req.get('content-length')) {
      metrics.httpRequestSize.observe({
        method: req.method,
        route: route,
      }, parseInt(req.get('content-length')));
    }
  });
  
  next();
};

/**
 * Middleware untuk tracking business metrics
 * Helper functions untuk incrementing custom metrics
 */
const trackBusinessMetric = (metricName, labels = {}, value = 1) => {
  if (metrics[metricName]) {
    metrics[metricName].inc(labels, value);
  }
};

/**
 * Track report generation
 */
const trackReportGenerated = (reportType, status = 'success') => {
  trackBusinessMetric('reportsGenerated', {
    report_type: reportType,
    status: status,
  });
};

/**
 * Track file uploads
 */
const trackFileUpload = (fileType, status = 'success') => {
  trackBusinessMetric('fileUploads', {
    file_type: fileType,
    status: status,
  });
};

/**
 * Track user logins
 */
const trackUserLogin = (userType = 'normal', status = 'success') => {
  trackBusinessMetric('userLogins', {
    user_type: userType,
    status: status,
  });
};

/**
 * Track SSO requests
 */
const trackSsoRequest = (clientId, status = 'success') => {
  trackBusinessMetric('ssoRequests', {
    client_id: clientId,
    status: status,
  });
};

/**
 * Track queue metrics
 */
const trackQueueMessage = (queueName, status = 'processed') => {
  trackBusinessMetric('queue_messagesProcessed', {
    queue_name: queueName,
    status: status,
  });
};

const updateQueueSize = (queueName, size) => {
  if (metrics.queue.queueSize) {
    metrics.queue.queueSize.set({ queue_name: queueName }, size);
  }
};

/**
 * Track active connections
 */
const updateActiveConnections = (count) => {
  metrics.activeConnections.set(count);
};

/**
 * Track database connections
 */
const updateDatabaseConnections = (status, count) => {
  metrics.databaseConnections.set({ status }, count);
};

module.exports = {
  prometheusMiddleware,
  trackBusinessMetric,
  trackReportGenerated,
  trackFileUpload,
  trackUserLogin,
  trackSsoRequest,
  trackQueueMessage,
  updateQueueSize,
  updateActiveConnections,
  updateDatabaseConnections,
};
