const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { Logger } = require('../../utils/logger');

/**
 * Controller layer untuk HTTP request/response handling Customer
 * Hanya menangani request/response, business logic ada di service
 */

/**
 * Get all customers dengan pagination dan filtering
 */
const getAll = async (req, res) => {
  try {
    const { 
      pageIndex = 0, 
      pageSize = 50, 
      lastmodified = null,
      netsuite_id = null
    } = req.body;
    
    Logger.info('[CUSTOMERS/GET] Request received', { 
      pageIndex, 
      pageSize, 
      lastmodified,
      netsuite_id 
    });
    
    const result = await service.getAllCustomers(pageIndex, pageSize, lastmodified, netsuite_id);
    
    // Set header untuk indikasi sync jika ada
    if (result.syncedCount > 0) {
      res.setHeader('X-Sync-Triggered', 'true');
      res.setHeader('X-Synced-Count', result.syncedCount.toString());
    }
    
    return res.status(200).json(result);
  } catch (error) {
    Logger.error('[CUSTOMERS/GET] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Get customer by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.getCustomerById(id);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get customer by NetSuite ID dengan on-demand sync
 */
const getByNetSuiteId = async (req, res) => {
  try {
    const { netsuite_id } = req.params;
    
    const result = await service.getCustomerByNetSuiteId(netsuite_id);
    
    if (result.syncTriggered) {
      res.setHeader('X-Sync-Triggered', 'true');
      if (result.jobId) {
        res.setHeader('X-Job-Id', result.jobId);
      }
    }
    
    if (!result.data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, result.data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Create customer di NetSuite dan sync ke database lokal
 */
const create = async (req, res) => {
  try {
    const customerData = req.body;
    const localCustomer = await service.createCustomer(customerData);
    return baseResponse(res, localCustomer, 'Customer berhasil dibuat', 201);
  } catch (error) {
    Logger.error('Error creating customer:', error);
    if (error.message === 'Gagal membuat customer di NetSuite') {
      return errorResponse(res, { message: error.message }, 500);
    }
    return errorResponse(res, error);
  }
};

/**
 * Update customer di NetSuite dan sync ke database lokal
 */
const update = async (req, res) => {
  try {
    const { internalid } = req.body;
    const customerData = req.body;

    if (!internalid) {
      return errorResponse(res, { message: 'internalid diperlukan untuk update customer' }, 400);
    }

    const localCustomer = await service.updateCustomer(internalid, customerData);
    return baseResponse(res, localCustomer, 'Customer berhasil diupdate');
  } catch (error) {
    Logger.error('Error updating customer:', error);
    if (error.message === 'Gagal mengupdate customer di NetSuite') {
      return errorResponse(res, { message: error.message }, 500);
    }
    return errorResponse(res, error);
  }
};

/**
 * Read customer langsung dari NetSuite
 */
const readFromNetSuite = async (req, res) => {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      return errorResponse(res, { message: 'customerId diperlukan untuk read customer dari NetSuite' }, 400);
    }

    const localCustomer = await service.readCustomerFromNetSuite(customerId);

    if (!localCustomer) {
      return emptyDataResponse(res, 1, 0, false);
    }

    return baseResponse(res, localCustomer);
  } catch (error) {
    Logger.error('Error reading customer from NetSuite:', error);
    return errorResponse(res, error);
  }
};

/**
 * Search customers dari NetSuite dengan POST
 */
const searchFromNetSuite = async (req, res) => {
  try {
    const { 
      page = null, 
      pageIndex = null, 
      pageSize = 50, 
      since = null, 
      lastmodified = null,
      netsuite_id = null 
    } = req.body;

    // Convert old format to new format
    const finalPageIndex = pageIndex !== null ? pageIndex : (page !== null ? page - 1 : 0);
    const finalLastModified = lastmodified || since;

    const response = await service.searchCustomersFromNetSuite(
      finalPageIndex,
      pageSize,
      finalLastModified,
      netsuite_id
    );

    // Check if response is empty
    if (!response || (response.items && Array.isArray(response.items) && response.items.length === 0)) {
      return emptyDataResponse(res, finalPageIndex + 1, pageSize || 0, true);
    }

    return baseResponse(res, response);
  } catch (error) {
    Logger.error('Error searching customers from NetSuite:', error);
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getById,
  getByNetSuiteId,
  readFromNetSuite,
  create,
  update,
  searchFromNetSuite,
};

