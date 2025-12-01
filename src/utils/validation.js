/**
 * Validation utilities for SSO API
 */

/**
 * Validate request data against column definitions
 */
const validateRequest = (data, rules, columns) => {
  const errors = []
  
  // Check required fields
  if (rules.required) {
    rules.required.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`)
      }
    })
  }
  
  // Validate field types and constraints
  Object.keys(data).forEach(field => {
    const columnDef = columns[field]
    if (columnDef) {
      const value = data[field]
      
      // Skip validation for undefined/null values
      if (value === undefined || value === null) return
      
      // String validation
      if (columnDef.type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`)
        } else if (columnDef.maxLength && value.length > columnDef.maxLength) {
          errors.push(`${field} must not exceed ${columnDef.maxLength} characters`)
        } else if (columnDef.minLength && value.length < columnDef.minLength) {
          errors.push(`${field} must be at least ${columnDef.minLength} characters`)
        }
      }
      
      // Email validation
      if (columnDef.format === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors.push(`${field} must be a valid email address`)
        }
      }
      
      // Number validation
      if (columnDef.type === 'integer' || columnDef.type === 'decimal') {
        if (isNaN(value)) {
          errors.push(`${field} must be a number`)
        } else if (columnDef.minValue && value < columnDef.minValue) {
          errors.push(`${field} must be at least ${columnDef.minValue}`)
        }
      }
      
      // Boolean validation
      if (columnDef.type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`)
        }
      }
      
      // UUID validation
      if (columnDef.type === 'uuid') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(value)) {
          errors.push(`${field} must be a valid UUID`)
        }
      }
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate UUID format
 */
const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str
  return str.trim()
}

/**
 * Validate pagination parameters
 */
const validatePagination = (page, limit) => {
  const errors = []
  
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  
  if (isNaN(pageNum) || pageNum < 1) {
    errors.push('Page must be a positive integer')
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push('Limit must be between 1 and 100')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    page: pageNum || 1,
    limit: limitNum || 10
  }
}

module.exports = {
  validateRequest,
  validateUUID,
  validateEmail,
  sanitizeString,
  validatePagination
}
