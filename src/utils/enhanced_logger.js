const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.warn('dotenv not available, using process.env directly');
}

const ssoConfig = require('../config/sso_config');

// Import winston with error handling
let winston, DailyRotateFile;
try {
  winston = require('winston');
  DailyRotateFile = require('winston-daily-rotate-file');
} catch (error) {
  console.warn('Winston not available, using fallback logger');
  // Fallback logger implementation
  winston = {
    createLogger: () => ({
      error: console.error,
      warn: console.warn,
      info: console.log,
      debug: console.log,
      on: () => {}
    }),
    format: {
      combine: (...formats) => ({}),
      colorize: () => ({}),
      timestamp: () => ({}),
      printf: (fn) => fn,
      errors: (opts) => ({})
    },
    transports: {
      Console: class ConsoleTransport {
        constructor(opts) {
          this.opts = opts;
        }
      }
    }
  };
  DailyRotateFile = class DailyRotateFileTransport {
    constructor(opts) {
      this.opts = opts;
    }
  };
}

class EnhancedLogger {
  constructor() {
    this.loggers = new Map();
    this.auditLogger = null;
    this.metricsLogger = null;
    this.initializeLoggers();
  }

  initializeLoggers() {
    // Create logs directory if it doesn't exist
    const logDir = ssoConfig.sso.logging.logDirectory;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Main application logger
    this.createApplicationLogger();
    
    // Audit logger for security events
    if (ssoConfig.sso.logging.enableAuditLog) {
      this.createAuditLogger();
    }

    // Metrics logger for performance monitoring
    if (ssoConfig.sso.monitoring.enableMetrics) {
      this.createMetricsLogger();
    }
  }

  createApplicationLogger() {
    const transports = [];

    // Console transport
    transports.push(new winston.transports.Console({
      level: ssoConfig.sso.logging.level,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    }));

    // File transport with rotation
    if (ssoConfig.sso.logging.enableFileLogging) {
      transports.push(new DailyRotateFile({
        filename: path.join(ssoConfig.sso.logging.logDirectory, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: ssoConfig.sso.logging.maxLogSize,
        maxFiles: ssoConfig.sso.logging.maxLogFiles,
        level: ssoConfig.sso.logging.level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }));
    }

    this.loggers.set('application', winston.createLogger({
      level: ssoConfig.sso.logging.level,
      transports,
      exitOnError: false
    }));
  }

  createAuditLogger() {
    const auditLogger = winston.createLogger({
      level: 'info',
      transports: [
        new DailyRotateFile({
          filename: path.join(ssoConfig.sso.logging.logDirectory, 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: ssoConfig.sso.logging.maxLogSize,
          maxFiles: ssoConfig.sso.logging.maxLogFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ],
      exitOnError: false
    });

    this.auditLogger = auditLogger;
  }

  createMetricsLogger() {
    const metricsLogger = winston.createLogger({
      level: 'info',
      transports: [
        new DailyRotateFile({
          filename: path.join(ssoConfig.sso.logging.logDirectory, 'metrics-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: ssoConfig.sso.logging.maxLogSize,
          maxFiles: ssoConfig.sso.logging.maxLogFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ],
      exitOnError: false
    });

    this.metricsLogger = metricsLogger;
  }

  // Application logging methods
  error(message, meta = {}) {
    this.loggers.get('application').error(message, this.enrichMeta(meta));
  }

  warn(message, meta = {}) {
    this.loggers.get('application').warn(message, this.enrichMeta(meta));
  }

  info(message, meta = {}) {
    this.loggers.get('application').info(message, this.enrichMeta(meta));
  }

  debug(message, meta = {}) {
    this.loggers.get('application').debug(message, this.enrichMeta(meta));
  }

  // Audit logging methods
  audit(event, details = {}) {
    if (this.auditLogger) {
      this.auditLogger.info('AUDIT_EVENT', {
        event,
        timestamp: new Date().toISOString(),
        ...details
      });
    }
  }

  auditLogin(userId, success, details = {}) {
    this.audit('LOGIN_ATTEMPT', {
      userId,
      success,
      ...details
    });
  }

  auditLogout(userId, sessionId, details = {}) {
    this.audit('LOGOUT', {
      userId,
      sessionId,
      ...details
    });
  }

  auditTokenExchange(userId, clientId, success, details = {}) {
    this.audit('TOKEN_EXCHANGE', {
      userId,
      clientId,
      success,
      ...details
    });
  }

  auditClientRegistration(clientId, success, details = {}) {
    this.audit('CLIENT_REGISTRATION', {
      clientId,
      success,
      ...details
    });
  }

  auditSecurityViolation(type, details = {}) {
    this.audit('SECURITY_VIOLATION', {
      type,
      severity: 'high',
      ...details
    });
  }

  // Metrics logging methods
  metrics(metric, value, tags = {}) {
    if (this.metricsLogger) {
      this.metricsLogger.info('METRIC', {
        metric,
        value,
        tags,
        timestamp: new Date().toISOString()
      });
    }
  }

  metricsCounter(name, value = 1, tags = {}) {
    this.metrics(`counter.${name}`, value, tags);
  }

  metricsGauge(name, value, tags = {}) {
    this.metrics(`gauge.${name}`, value, tags);
  }

  metricsTimer(name, duration, tags = {}) {
    this.metrics(`timer.${name}`, duration, tags);
  }

  // Performance logging
  logPerformance(operation, duration, details = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...details
    });

    this.metricsTimer(operation, duration, details);
  }

  // Security logging
  logSecurityEvent(event, severity, details = {}) {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    
    this[level](`Security Event: ${event}`, {
      event,
      severity,
      ...details
    });

    this.auditSecurityViolation(event, details);
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function(data) {
        const duration = Date.now() - start;
        
        // Log request
        this.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          contentLength: res.get('content-length')
        });

        // Log metrics
        this.metricsCounter('http.requests', 1, {
          method: req.method,
          status: res.statusCode,
          route: req.route?.path || req.url
        });

        this.metricsTimer('http.request.duration', duration, {
          method: req.method,
          status: res.statusCode
        });

        originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  // Enrich metadata with common fields
  enrichMeta(meta) {
    return {
      ...meta,
      service: 'gate-sso',
      version: process.env.npm_package_version || '1.0.0',
      environment: ssoConfig.server.environment,
      pid: process.pid,
      timestamp: new Date().toISOString()
    };
  }

  // Get logger statistics
  getStats() {
    return {
      loggers: Array.from(this.loggers.keys()),
      auditEnabled: !!this.auditLogger,
      metricsEnabled: !!this.metricsLogger,
      logLevel: ssoConfig.sso.logging.level,
      logDirectory: ssoConfig.sso.logging.logDirectory
    };
  }

  // Create child logger with additional context
  child(defaultMeta = {}) {
    const childLogger = {
      error: (message, meta = {}) => this.error(message, { ...defaultMeta, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...defaultMeta, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...defaultMeta, ...meta }),
      debug: (message, meta = {}) => this.debug(message, { ...defaultMeta, ...meta }),
      audit: (event, details = {}) => this.audit(event, { ...defaultMeta, ...details }),
      metrics: (metric, value, tags = {}) => this.metrics(metric, value, { ...defaultMeta, ...tags })
    };

    return childLogger;
  }

  // Flush all logs
  flush() {
    return new Promise((resolve) => {
      let pending = 0;
      
      for (const logger of this.loggers.values()) {
        pending++;
        logger.on('finish', () => {
          pending--;
          if (pending === 0) resolve();
        });
      }

      if (pending === 0) resolve();
    });
  }
}

// Create singleton instance
const enhancedLogger = new EnhancedLogger();

// Export both class and instance
module.exports = {
  EnhancedLogger,
  Logger: enhancedLogger
};
