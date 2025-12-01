/**
 * Standard response utilities for SSO API
 */

/**
 * Base response (standard format)
 * Usage:
 * - baseResponse(res, data)
 * - baseResponse(res, data, message)
 * - baseResponse(res, data, message, statusCode)
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Response data (object, array, string, etc.)
 * @param {string|null} message - Optional message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const baseResponse = (res, data = null, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data: data || null,
    timestamp: new Date().toISOString()
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Success response
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  })
}

/**
 * Error response
 */
const errorResponse = (res, error = 'Error', statusCode = 500, errors = null) => {
  // Handle both string and object error
  const message = typeof error === 'object' && error.message ? error.message : error;
  const errorDetails = typeof error === 'object' && error.error ? error.error : errors;
  
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errorDetails,
    timestamp: new Date().toISOString()
  })
}

/**
 * Validation error response
 */
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
    timestamp: new Date().toISOString()
  })
}

/**
 * Not found response
 */
const notFoundResponse = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  })
}

/**
 * Unauthorized response
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  })
}

/**
 * Forbidden response
 */
const forbiddenResponse = (res, message = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  })
}

/**
 * Empty data response (standard format untuk data kosong)
 * Format standar untuk response ketika data tidak ada atau kosong
 * 
 * @param {Object} res - Express response object
 * @param {number} page - Current page (default: 1)
 * @param {number} limit - Items per page (default: 0)
 * @param {boolean} isArray - Apakah data berupa array (default: true)
 * @returns {Object} Response dengan format standar
 * 
 * @example
 * // Untuk array kosong
 * emptyDataResponse(res, 1, 10, true)
 * // Returns: { success: true, data: { items: [], pagination: {...} } }
 * 
 * @example
 * // Untuk non-array kosong
 * emptyDataResponse(res, 1, 0, false)
 * // Returns: { success: true, data: { items: {}, pagination: {...} } }
 */
const emptyDataResponse = (res, page = 1, limit = 0, isArray = true) => {
  return res.status(200).json({
    success: true,
    data: {
      items: isArray ? [] : {},
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 0,
        total: 0,
        totalPages: 0
      }
    }
  })
}

module.exports = {
  baseResponse,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  emptyDataResponse
}
