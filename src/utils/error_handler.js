const { Logger } = require('../utils/logger');

class SSOError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'SSOError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.stack = this.stack;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

class ValidationError extends SSOError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends SSOError {
  constructor(message, details = null) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends SSOError {
  constructor(message, details = null) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

class RateLimitError extends SSOError {
  constructor(message, details = null) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
  }
}

class ClientError extends SSOError {
  constructor(message, details = null) {
    super(message, 'CLIENT_ERROR', 400, details);
    this.name = 'ClientError';
  }
}

class TokenError extends SSOError {
  constructor(message, details = null) {
    super(message, 'TOKEN_ERROR', 401, details);
    this.name = 'TokenError';
  }
}

class SessionError extends SSOError {
  constructor(message, details = null) {
    super(message, 'SESSION_ERROR', 400, details);
    this.name = 'SessionError';
  }
}

class DatabaseError extends SSOError {
  constructor(message, details = null) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

class ConfigurationError extends SSOError {
  constructor(message, details = null) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}

class ExternalServiceError extends SSOError {
  constructor(message, details = null) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.name = 'ExternalServiceError';
  }
}

class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 1000;
  }

  // Handle different types of errors
  handleError(error, req = null, additionalContext = {}) {
    const errorInfo = this.categorizeError(error);
    
    // Log error with context
    this.logError(error, errorInfo, req, additionalContext);
    
    // Track error statistics
    this.trackError(errorInfo);
    
    // Add to history
    this.addToHistory(error, errorInfo, req, additionalContext);
    
    // Return appropriate response
    return this.formatErrorResponse(error, errorInfo);
  }

  categorizeError(error) {
    if (error instanceof SSOError) {
      return {
        type: error.name,
        code: error.code,
        statusCode: error.statusCode,
        category: this.getErrorCategory(error.statusCode),
        severity: this.getErrorSeverity(error.statusCode)
      };
    }

    // Categorize generic errors
    if (error.name === 'ValidationError') {
      return {
        type: 'ValidationError',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        category: 'client',
        severity: 'low'
      };
    }

    if (error.name === 'SyntaxError' || error.name === 'ReferenceError') {
      return {
        type: 'SyntaxError',
        code: 'SYNTAX_ERROR',
        statusCode: 500,
        category: 'server',
        severity: 'high'
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        type: 'ConnectionError',
        code: 'CONNECTION_ERROR',
        statusCode: 502,
        category: 'external',
        severity: 'medium'
      };
    }

    // Default categorization
    return {
      type: 'UnknownError',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      category: 'server',
      severity: 'high'
    };
  }

  getErrorCategory(statusCode) {
    if (statusCode >= 400 && statusCode < 500) return 'client';
    if (statusCode >= 500 && statusCode < 600) return 'server';
    return 'external';
  }

  getErrorSeverity(statusCode) {
    if (statusCode >= 500) return 'high';
    if (statusCode >= 400 && statusCode < 500) return 'medium';
    return 'low';
  }

  logError(error, errorInfo, req, additionalContext) {
    const logContext = {
      error: {
        name: error.name,
        message: error.message,
        code: errorInfo.code,
        statusCode: errorInfo.statusCode,
        stack: error.stack
      },
      request: req ? {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      } : null,
      context: additionalContext,
      severity: errorInfo.severity,
      category: errorInfo.category
    };

    switch (errorInfo.severity) {
      case 'high':
        Logger.error(`High severity error: ${error.message}`, logContext);
        break;
      case 'medium':
        Logger.warn(`Medium severity error: ${error.message}`, logContext);
        break;
      case 'low':
        Logger.info(`Low severity error: ${error.message}`, logContext);
        break;
      default:
        Logger.error(`Unknown severity error: ${error.message}`, logContext);
    }
  }

  trackError(errorInfo) {
    const key = `${errorInfo.type}:${errorInfo.code}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
  }

  addToHistory(error, errorInfo, req, additionalContext) {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: errorInfo.code,
        statusCode: errorInfo.statusCode
      },
      request: req ? {
        method: req.method,
        url: req.url,
        ip: req.ip
      } : null,
      context: additionalContext,
      severity: errorInfo.severity,
      category: errorInfo.category
    };

    this.errorHistory.unshift(historyEntry);
    
    // Keep only recent errors
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  formatErrorResponse(error, errorInfo) {
    const response = {
      error: errorInfo.code,
      message: error.message,
      statusCode: errorInfo.statusCode,
      timestamp: new Date().toISOString()
    };

    // Add details if available
    if (error.details) {
      response.details = error.details;
    }

    // Add request ID if available
    if (error.requestId) {
      response.requestId = error.requestId;
    }

    // Don't expose internal details in production
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
      response.type = errorInfo.type;
    }

    return response;
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorTypes: Object.fromEntries(this.errorCounts),
      recentErrors: this.errorHistory.slice(0, 10),
      errorRate: this.calculateErrorRate()
    };

    return stats;
  }

  calculateErrorRate() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentErrors = this.errorHistory.filter(entry => 
      new Date(entry.timestamp).getTime() > oneHourAgo
    );

    return {
      lastHour: recentErrors.length,
      last24Hours: this.errorHistory.filter(entry => 
        new Date(entry.timestamp).getTime() > (now - (24 * 60 * 60 * 1000))
      ).length
    };
  }

  // Clear error history
  clearHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
  }

  // Middleware for Express error handling
  middleware() {
    return (error, req, res, next) => {
      const errorResponse = this.handleError(error, req, {
        middleware: 'express',
        route: req.route?.path,
        params: req.params,
        query: req.query,
        body: req.body
      });

      res.status(errorResponse.statusCode).json(errorResponse);
    };
  }

  // Async error wrapper
  asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Try-catch wrapper for async functions
  async tryCatch(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      throw this.handleError(error, null, context);
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = {
  SSOError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ClientError,
  TokenError,
  SessionError,
  DatabaseError,
  ConfigurationError,
  ExternalServiceError,
  ErrorHandler,
  errorHandler
};
