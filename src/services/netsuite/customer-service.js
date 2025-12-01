const { getNetSuiteClient } = require('./client');
const { logger } = require('../../utils/logger');

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
      logger().info(`Fetching customer from NetSuite: ${customerId}`);

      const response = await this.client.get({
        customerId,
        operation: 'read',
      });

      if (response.success && response.data) {
        return this.transformCustomerData(response.data);
      }

      return null;
    } catch (error) {
      logger().error(`Error fetching customer ${customerId} from NetSuite:`, error);
      throw error;
    }
  }

  /**
   * Get customers dengan pagination
   * Sesuai dengan "Get Customer Page" dari Postman collection
   */
  async getCustomersPage(params = {}) {
    try {
      const { page = 1, pageSize = 500, since = null, netsuite_id = null } = params;

      logger().info('Fetching customers page from NetSuite', { page, pageSize, since, netsuite_id });

      // Build request body sesuai dengan format NetSuite
      const requestBody = {
        operation: 'search',
        page,
        pageSize,
        ...(since && { lastModifiedDate: since }),
        ...(netsuite_id && { netsuite_id }),
      };

      const response = await this.client.post(requestBody, {
        operation: 'getPage',
      });

      if (response.success && response.data) {
        return this.transformCustomerListResponse(response.data);
      }

      return {
        items: [],
        hasMore: false,
        totalResults: 0,
      };
    } catch (error) {
      logger().error('Error fetching customers page from NetSuite:', error);
      throw error;
    }
  }

  /**
   * Create customer di NetSuite
   * Sesuai dengan "Customer (Create)" dari Postman collection
   */
  async createCustomer(customerData) {
    try {
      logger().info('Creating customer in NetSuite', { companyname: customerData.companyname });

      const requestBody = this.transformCustomerToNetSuiteFormat(customerData, 'create');

      const response = await this.client.post(requestBody, {
        operation: 'create',
      });

      if (response.success && response.data) {
        return this.transformCustomerData(response.data);
      }

      throw new Error('Failed to create customer in NetSuite');
    } catch (error) {
      logger().error('Error creating customer in NetSuite:', error);
      throw error;
    }
  }

  /**
   * Update customer di NetSuite
   * Sesuai dengan "Customer (Edit)" dari Postman collection
   */
  async updateCustomer(internalId, customerData) {
    try {
      logger().info(`Updating customer in NetSuite: ${internalId}`);

      const requestBody = this.transformCustomerToNetSuiteFormat(customerData, 'update', internalId);

      const response = await this.client.post(requestBody, {
        operation: 'update',
      });

      if (response.success && response.data) {
        return this.transformCustomerData(response.data);
      }

      throw new Error(`Failed to update customer ${internalId} in NetSuite`);
    } catch (error) {
      logger().error(`Error updating customer ${internalId} in NetSuite:`, error);
      throw error;
    }
  }

  /**
   * Search customers dengan filter
   * Untuk incremental sync dengan lastModifiedDate filter
   */
  async searchCustomers(params = {}) {
    try {
      const {
        since = null,
        page = 1,
        pageSize = 500,
        netsuite_id = null,
      } = params;

      logger().info('Searching customers in NetSuite', { since, page, pageSize, netsuite_id });

      // Jika hanya satu customer yang dicari
      if (netsuite_id) {
        const customer = await this.getCustomer(netsuite_id);
        if (customer) {
          return {
            items: [customer],
            hasMore: false,
            totalResults: 1,
          };
        }
        return {
          items: [],
          hasMore: false,
          totalResults: 0,
        };
      }

      // Get customers dengan pagination
      return await this.getCustomersPage({ since, page, pageSize });
    } catch (error) {
      logger().error('Error searching customers in NetSuite:', error);
      throw error;
    }
  }

  /**
   * Transform customer data dari NetSuite ke format internal
   */
  transformCustomerData(nsData) {
    if (!nsData) return null;

    // Extract data sesuai dengan struktur response NetSuite
    // Sesuaikan dengan struktur actual response dari NetSuite API
    return {
      netsuite_id: nsData.internalid?.toString() || nsData.id?.toString() || null,
      name: nsData.companyname || nsData.entityid || '',
      email: nsData.email || '',
      phone: nsData.phone || '',
      data: nsData, // Raw data untuk storage
      last_modified_netsuite: nsData.lastmodifieddate || nsData.lastModifiedDate || new Date().toISOString(),
    };
  }

  /**
   * Transform customer list response dari NetSuite
   */
  transformCustomerListResponse(nsResponse) {
    if (!nsResponse) {
      return {
        items: [],
        hasMore: false,
        totalResults: 0,
      };
    }

    // Extract items array dari response
    let items = [];
    if (Array.isArray(nsResponse.items)) {
      items = nsResponse.items;
    } else if (Array.isArray(nsResponse.data)) {
      items = nsResponse.data;
    } else if (Array.isArray(nsResponse)) {
      items = nsResponse;
    }

    const transformedItems = items.map((item) => this.transformCustomerData(item)).filter(Boolean);

    return {
      items: transformedItems,
      hasMore: nsResponse.hasMore === true || nsResponse.has_more === true || false,
      totalResults: nsResponse.totalResults || nsResponse.total_results || transformedItems.length,
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

