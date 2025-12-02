const { getNetSuiteClient } = require('./client');
const { Logger } = require('../../utils/logger');
const { getScriptConfig } = require('../../config/netsuite');

/**
 * NetSuite Customer Service
 * Service khusus untuk operasi customer dengan NetSuite API
 */
class NetSuiteCustomerService {
  constructor() {
    this.client = getNetSuiteClient('customer');
  }

  /**
   * Get customer by ID dari NetSuite
   * Sesuai dengan "Customer (Read)" dari Postman collection
   */
  async getCustomer(customerId) {
    try {
      Logger.info(`Fetching customer from NetSuite: ${customerId}`);

      // Get script config from database (per module, bukan per operation)
      const scriptConfig = await getScriptConfig('customer');
      const response = await this.client.get({
        customerId,
        operation: 'read',
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformCustomerData(response.data);
      }

      return null;
    } catch (error) {
      Logger.error(`Error fetching customer ${customerId} from NetSuite:`, error);
      throw error;
    }
  }

  /**
   * Get customers dengan pagination
   * Sesuai dengan "Get Customer Page" dari Postman collection
   * Format baru: { pageSize, pageIndex, lastmodified }
   */
  async getCustomersPage(params = {}) {
    try {
      // Support both old format (page, since) and new format (pageIndex, lastmodified)
      const { 
        page = null, 
        pageIndex = null, 
        pageSize = 500, 
        since = null, 
        lastmodified = null,
        netsuite_id = null 
      } = params;

      // Convert old format to new format
      const finalPageIndex = pageIndex !== null ? pageIndex : (page !== null ? page - 1 : 0);
      const finalLastModified = lastmodified || since;

      Logger.info('Fetching customers page from NetSuite', { 
        pageIndex: finalPageIndex, 
        pageSize, 
        lastmodified: finalLastModified, 
        netsuite_id 
      });

      // Build request body sesuai dengan format NetSuite baru
      const requestBody = {
        pageSize,
        pageIndex: finalPageIndex,
        ...(finalLastModified && { lastmodified: finalLastModified }),
      };

      // Get script config from database (per module, bukan per operation)
      const scriptConfig = await getScriptConfig('customer');
      const response = await this.client.post(requestBody, {
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformCustomerListResponse(response.data);
      }

      return {
        items: [],
        hasMore: false,
        totalResults: 0,
        pageIndex: finalPageIndex,
        pageSize,
        totalRows: 0,
        totalPages: 0,
      };
    } catch (error) {
      Logger.error('Error fetching customers page from NetSuite:', error);
      throw error;
    }
  }

  /**
   * Create customer di NetSuite
   * Sesuai dengan "Customer (Create)" dari Postman collection
   */
  async createCustomer(customerData) {
    try {
      Logger.info('Creating customer in NetSuite', { companyname: customerData.companyname });

      const requestBody = this.transformCustomerToNetSuiteFormat(customerData, 'create');

      // Get script config from database (per module, bukan per operation)
      const scriptConfig = await getScriptConfig('customer');
      const response = await this.client.post(requestBody, {
        operation: 'create',
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformCustomerData(response.data);
      }

      throw new Error('Failed to create customer in NetSuite');
    } catch (error) {
      Logger.error('Error creating customer in NetSuite:', error);
      throw error;
    }
  }

  /**
   * Update customer di NetSuite
   * Sesuai dengan "Customer (Edit)" dari Postman collection
   */
  async updateCustomer(internalId, customerData) {
    try {
      Logger.info(`Updating customer in NetSuite: ${internalId}`);

      const requestBody = this.transformCustomerToNetSuiteFormat(customerData, 'update', internalId);

      // Get script config from database (per module, bukan per operation)
      const scriptConfig = await getScriptConfig('customer');
      const response = await this.client.post(requestBody, {
        operation: 'update',
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformCustomerData(response.data);
      }

      throw new Error(`Failed to update customer ${internalId} in NetSuite`);
    } catch (error) {
      Logger.error(`Error updating customer ${internalId} in NetSuite:`, error);
      throw error;
    }
  }

  /**
   * Search customers dengan filter
   * Untuk incremental sync dengan lastModifiedDate filter
   * Support both old format (page, since) and new format (pageIndex, lastmodified)
   */
  async searchCustomers(params = {}) {
    try {
      const {
        since = null,
        lastmodified = null,
        page = null,
        pageIndex = null,
        pageSize = 500,
        netsuite_id = null,
      } = params;

      Logger.info('Searching customers in NetSuite', { 
        lastmodified: lastmodified || since, 
        pageIndex: pageIndex !== null ? pageIndex : (page !== null ? page - 1 : 0), 
        pageSize, 
        netsuite_id 
      });

      // Jika hanya satu customer yang dicari
      if (netsuite_id) {
        const customer = await this.getCustomer(netsuite_id);
        if (customer) {
          return {
            items: [customer],
            hasMore: false,
            totalResults: 1,
            pageIndex: 0,
            pageSize: 1,
            totalRows: 1,
            totalPages: 1,
          };
        }
        return {
          items: [],
          hasMore: false,
          totalResults: 0,
          pageIndex: 0,
          pageSize: 0,
          totalRows: 0,
          totalPages: 0,
        };
      }

      // Get customers dengan pagination - convert old format to new
      const finalPageIndex = pageIndex !== null ? pageIndex : (page !== null ? page - 1 : 0);
      const finalLastModified = lastmodified || since;

      return await this.getCustomersPage({ 
        pageIndex: finalPageIndex, 
        pageSize, 
        lastmodified: finalLastModified 
      });
    } catch (error) {
      Logger.error('Error searching customers in NetSuite:', error);
      throw error;
    }
  }

  /**
   * Parse date dari format NetSuite
   * Format baru: "YYYY-MM-DDTHH:mm:ss+07:00" (ISO 8601 dengan timezone)
   * Format lama: "DD/MM/YYYY HH:MM AM/PM" atau "DD/MM/YYYY"
   */
  parseNetSuiteDate(dateString) {
    if (!dateString) return null;

    try {
      // Format baru: ISO 8601 dengan timezone "2025-12-02T08:56:00+07:00"
      const iso8601Pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2})$/;
      const iso8601Match = dateString.match(iso8601Pattern);

      if (iso8601Match) {
        // Parse ISO 8601 format dengan timezone
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }

      // Format lama dengan waktu: "21/11/2025 11:28 AM" atau "21/11/2025 3:07 PM"
      const dateTimePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i;
      const dateTimeMatch = dateString.match(dateTimePattern);

      if (dateTimeMatch) {
        const [, day, month, year, hour, minute, ampm] = dateTimeMatch;
        let hour24 = parseInt(hour, 10);
        
        if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
          hour24 = 0;
        }

        const date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          hour24,
          parseInt(minute, 10)
        );

        return date.toISOString();
      }

      // Format lama tanpa waktu: "21/11/2025"
      const dateOnlyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const dateOnlyMatch = dateString.match(dateOnlyPattern);

      if (dateOnlyMatch) {
        const [, day, month, year] = dateOnlyMatch;
        const date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10)
        );

        return date.toISOString();
      }

      // Fallback: try to parse as ISO date
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }

      return null;
    } catch (error) {
      Logger.warn(`Failed to parse date: ${dateString}`, error);
      return null;
    }
  }

  /**
   * Transform customer data dari NetSuite ke format internal
   * Support format baru: { internalId, entityId, companyName, email, phone, lastModifiedDate }
   */
  transformCustomerData(nsData) {
    if (!nsData) return null;

    // Extract data sesuai dengan struktur response NetSuite baru
    // Format baru: internalId, entityId, companyName, email, phone, lastModifiedDate
    const internalId = nsData.internalId?.toString() || nsData.internalid?.toString() || nsData.id?.toString() || null;
    const companyName = nsData.companyName || nsData.companyname || '';
    const entityId = nsData.entityId || nsData.entityid || '';
    const name = companyName || entityId || '';
    
    // Parse lastModifiedDate dari format "21/11/2025 11:28 AM"
    let lastModified = null;
    if (nsData.lastModifiedDate) {
      lastModified = this.parseNetSuiteDate(nsData.lastModifiedDate);
    } else if (nsData.lastmodifieddate) {
      lastModified = this.parseNetSuiteDate(nsData.lastmodifieddate);
    } else if (nsData.lastModifiedDate) {
      lastModified = this.parseNetSuiteDate(nsData.lastModifiedDate);
    }

    // Fallback ke current date jika tidak ada
    if (!lastModified) {
      lastModified = new Date().toISOString();
    }

    return {
      netsuite_id: internalId,
      name: name,
      email: nsData.email || '',
      phone: nsData.phone || '',
      data: nsData, // Raw data untuk storage
      last_modified_netsuite: lastModified,
    };
  }

  /**
   * Transform customer list response dari NetSuite
   * Format baru: { success, pageIndex, pageSize, totalRows, totalPages, data: [...] }
   */
  transformCustomerListResponse(nsResponse) {
    if (!nsResponse) {
      return {
        items: [],
        hasMore: false,
        totalResults: 0,
        pageIndex: 0,
        pageSize: 0,
        totalRows: 0,
        totalPages: 0,
      };
    }

    // Extract items array dari response
    // Format baru: response.data adalah array
    let items = [];
    if (Array.isArray(nsResponse.data)) {
      items = nsResponse.data;
    } else if (Array.isArray(nsResponse.items)) {
      items = nsResponse.items;
    } else if (Array.isArray(nsResponse)) {
      items = nsResponse;
    }

    const transformedItems = items.map((item) => this.transformCustomerData(item)).filter(Boolean);

    // Extract pagination info dari format baru
    const pageIndex = nsResponse.pageIndex !== undefined ? nsResponse.pageIndex : 0;
    const pageSize = nsResponse.pageSize || transformedItems.length || 0;
    const totalRows = nsResponse.totalRows || transformedItems.length || 0;
    const totalPages = nsResponse.totalPages || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 0);

    // Calculate hasMore based on pagination
    const hasMore = pageIndex + 1 < totalPages;

    return {
      items: transformedItems,
      hasMore: hasMore,
      totalResults: totalRows,
      pageIndex: pageIndex,
      pageSize: pageSize,
      totalRows: totalRows,
      totalPages: totalPages,
    };
  }

  /**
   * Transform customer data ke format NetSuite untuk create/update
   * Sesuai dengan format dari Postman collection
   */
  transformCustomerToNetSuiteFormat(customerData, operation = 'create', internalId = null) {
    const nsData = {
      customform: customerData.customform || '5',
      isperson: customerData.isperson || 'F',
      firstname: customerData.firstname || '',
      lastname: customerData.lastname || '',
      companyname: customerData.companyname || customerData.name || '',
      subsidiary: customerData.subsidiary || '1',
      email: customerData.email || '',
      phone: customerData.phone || '',
      vatregnumber: customerData.vatregnumber || '',
      autoname: customerData.autoname !== undefined ? customerData.autoname : false,
      entityid: customerData.entityid || customerData.netsuite_id || '',
      isinactive: customerData.isinactive !== undefined ? customerData.isinactive : false,
      transactionType: customerData.transactionType || 'customer',
    };

    // Add internalid untuk update operation
    if (operation === 'update' && internalId) {
      nsData.internalid = internalId;
    }

    // Add address jika ada
    if (customerData.address && Array.isArray(customerData.address)) {
      nsData.address = customerData.address;
    } else if (customerData.addrtext) {
      nsData.address = [
        {
          defaultshipping: 'TRUE',
          defaultbilling: 'TRUE',
          country: customerData.country || 'ID',
          label: customerData.companyname || customerData.name || '',
          override_initialvalue: 'TRUE',
          addrtext: customerData.addrtext,
        },
      ];
    }

    return nsData;
  }
}

// Singleton instance
let customerServiceInstance = null;

/**
 * Get NetSuite customer service instance
 */
const getNetSuiteCustomerService = () => {
  if (!customerServiceInstance) {
    customerServiceInstance = new NetSuiteCustomerService();
  }
  return customerServiceInstance;
};

module.exports = {
  NetSuiteCustomerService,
  getNetSuiteCustomerService,
};

