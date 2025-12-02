const { getNetSuiteClient } = require('./client');
const { Logger } = require('../../utils/logger');
const { getScriptConfig } = require('../../config/netsuite');

/**
 * NetSuite Vendor Service
 * Service khusus untuk operasi vendor dengan NetSuite API
 */
class NetSuiteVendorService {
  constructor() {
    this.client = getNetSuiteClient('vendor');
  }

  /**
   * Get vendor by ID dari NetSuite
   */
  async getVendor(vendorId) {
    try {
      Logger.info(`Fetching vendor from NetSuite: ${vendorId}`);

      // Get script config from database (per module, bukan per operation)
      const scriptConfig = await getScriptConfig('vendor');
      const response = await this.client.get({
        vendorId,
        operation: 'read',
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformVendorData(response.data);
      }

      return null;
    } catch (error) {
      Logger.error(`Error fetching vendor ${vendorId} from NetSuite:`, error);
      throw error;
    }
  }

  /**
   * Get vendors dengan pagination
   * Format: { pageSize, pageIndex, lastmodified }
   */
  async getVendorsPage(params = {}) {
    try {
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

      Logger.info('Fetching vendors page from NetSuite', { 
        pageIndex: finalPageIndex, 
        pageSize, 
        lastmodified: finalLastModified, 
        netsuite_id 
      });

      // Build request body sesuai dengan format NetSuite
      const requestBody = {
        pageSize,
        pageIndex: finalPageIndex,
        ...(finalLastModified && { lastmodified: finalLastModified }),
      };

      // Get script config from database (per module, bukan per operation)
      const scriptConfig = await getScriptConfig('vendor');
      const response = await this.client.post(requestBody, {
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformVendorListResponse(response.data);
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
      Logger.error('Error fetching vendors page from NetSuite:', error);
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
   * Transform vendor data dari NetSuite ke format internal
   * Support format: { internalId, entityId, companyName, email, phone, lastModifiedDate }
   */
  transformVendorData(nsData) {
    if (!nsData) return null;

    // Extract data sesuai dengan struktur response NetSuite
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
   * Transform vendor list response dari NetSuite
   * Format: { success, pageIndex, pageSize, totalRows, totalPages, data: [...] }
   */
  transformVendorListResponse(nsResponse) {
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
    let items = [];
    if (Array.isArray(nsResponse.data)) {
      items = nsResponse.data;
    } else if (Array.isArray(nsResponse.items)) {
      items = nsResponse.items;
    } else if (Array.isArray(nsResponse)) {
      items = nsResponse;
    }

    const transformedItems = items.map((item) => this.transformVendorData(item)).filter(Boolean);

    // Extract pagination info
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
}

// Singleton instance
let vendorServiceInstance = null;

/**
 * Get NetSuite vendor service instance
 */
const getNetSuiteVendorService = () => {
  if (!vendorServiceInstance) {
    vendorServiceInstance = new NetSuiteVendorService();
  }
  return vendorServiceInstance;
};

module.exports = {
  NetSuiteVendorService,
  getNetSuiteVendorService,
};

