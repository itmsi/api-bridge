const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { Logger } = require('../../utils/logger');

/**
 * Controller layer untuk HTTP request/response handling Vendor
 * Hanya menangani request/response, business logic ada di service
 */

/**
 * Get all vendors dengan pagination dan filtering
 */
const getAll = async (req, res) => {
  try {
    const { 
      pageIndex = 0, 
      pageSize = 50, 
      lastmodified = null,
      netsuite_id = null
    } = req.body;
    
    Logger.info('[VENDORS/GET] Request received', { 
      pageIndex, 
      pageSize, 
      lastmodified,
      netsuite_id 
    });
    
    const result = await service.getAllVendors(pageIndex, pageSize, lastmodified, netsuite_id);
    
    // Set header untuk indikasi sync jika ada
    if (result.syncedCount > 0) {
      res.setHeader('X-Sync-Triggered', 'true');
      res.setHeader('X-Synced-Count', result.syncedCount.toString());
    }
    
    return res.status(200).json(result);
  } catch (error) {
    Logger.error('[VENDORS/GET] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Get vendor by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.getVendorById(id);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get vendor by NetSuite ID dengan on-demand sync
 */
const getByNetSuiteId = async (req, res) => {
  try {
    const { netsuite_id } = req.params;
    
    const result = await service.getVendorByNetSuiteId(netsuite_id);
    
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
 * Create vendor di NetSuite dan sync ke database lokal
 */
const create = async (req, res) => {
  try {
    const vendorData = req.body;
    const localVendor = await service.createVendor(vendorData);
    return baseResponse(res, localVendor, 'Vendor berhasil dibuat', 201);
  } catch (error) {
    Logger.error('Error creating vendor:', error);
    if (error.message === 'Gagal membuat vendor di NetSuite') {
      return errorResponse(res, { message: error.message }, 500);
    }
    return errorResponse(res, error);
  }
};

/**
 * Update vendor di NetSuite dan sync ke database lokal
 */
const update = async (req, res) => {
  try {
    const { internalid } = req.body;
    const vendorData = req.body;

    if (!internalid) {
      return errorResponse(res, { message: 'internalid diperlukan untuk update vendor' }, 400);
    }

    const localVendor = await service.updateVendor(internalid, vendorData);
    return baseResponse(res, localVendor, 'Vendor berhasil diupdate');
  } catch (error) {
    Logger.error('Error updating vendor:', error);
    if (error.message === 'Gagal mengupdate vendor di NetSuite') {
      return errorResponse(res, { message: error.message }, 500);
    }
    return errorResponse(res, error);
  }
};

/**
 * Read vendor langsung dari NetSuite
 */
const readFromNetSuite = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return errorResponse(res, { message: 'vendorId diperlukan untuk read vendor dari NetSuite' }, 400);
    }

    const localVendor = await service.readVendorFromNetSuite(vendorId);

    if (!localVendor) {
      return emptyDataResponse(res, 1, 0, false);
    }

    return baseResponse(res, localVendor);
  } catch (error) {
    Logger.error('Error reading vendor from NetSuite:', error);
    return errorResponse(res, error);
  }
};

/**
 * Search vendors dari NetSuite dengan POST
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

    const response = await service.searchVendorsFromNetSuite(
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
    Logger.error('Error searching vendors from NetSuite:', error);
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

