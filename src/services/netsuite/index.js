/**
 * NetSuite Services Index
 * Central export untuk semua NetSuite services
 */

const { getOAuthService } = require('./oauth');
const { getNetSuiteClient } = require('./client');
const { getNetSuiteCustomerService } = require('./customer-service');

module.exports = {
  // OAuth Service
  getOAuthService,
  
  // NetSuite Client
  getNetSuiteClient,
  
  // Customer Service
  getNetSuiteCustomerService,
};

