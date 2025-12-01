/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const { LIMIT, PAGE } = require('./constant');

/**
 * Standard filter utility untuk semua module
 * Mendukung pagination, sorting, searching, dan filtering
 */

/**
 * Parse query parameters untuk pagination
 * @param {Object} req - Express request object
 * @param {Array} defaultOrder - Default order [column, direction]
 * @returns {Object} Pagination parameters
 */
const parsePagination = (req, defaultOrder = ['created_at', 'desc']) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGE);
  // const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || LIMIT));
  const limit = Math.max(1, parseInt(req.query.limit) || LIMIT);
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset,
  };
};

/**
 * Parse query parameters untuk sorting
 * @param {Object} req - Express request object
 * @param {Array} allowedColumns - Array kolom yang diizinkan untuk sorting
 * @param {Array} defaultOrder - Default order [column, direction]
 * @returns {Object} Sorting parameters
 */
const parseSorting = (req, allowedColumns = [], defaultOrder = ['created_at', 'desc']) => {
  const sortBy = req.query.sort_by || defaultOrder[0];
  const sortOrder = req.query.sort_order || defaultOrder[1];
  
  // Validasi kolom yang diizinkan
  const validColumn = allowedColumns.length > 0 && allowedColumns.includes(sortBy) 
    ? sortBy 
    : (defaultOrder[0] || 'created_at');
  
  // Validasi order direction
  const validOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) 
    ? sortOrder.toLowerCase() 
    : (defaultOrder[1] || 'desc');
  
  return {
    sortBy: validColumn,
    sortOrder: validOrder,
  };
};

/**
 * Parse query parameters untuk searching
 * @param {Object} req - Express request object
 * @param {Array} searchableColumns - Array kolom yang bisa di-search
 * @returns {Object} Search parameters
 */
const parseSearch = (req, searchableColumns = []) => {
  const searchTerm = req.query.search || req.query.q || '';
  
  return {
    searchTerm: searchTerm.trim(),
    searchableColumns,
  };
};

/**
 * Parse query parameters untuk filtering
 * @param {Object} req - Express request object
 * @param {Array} allowedFilters - Array kolom yang diizinkan untuk filter
 * @returns {Object} Filter parameters
 */
const parseFilters = (req, allowedFilters = []) => {
  const filters = {};
  
  if (allowedFilters.length === 0) {
    return filters;
  }
  
  Object.keys(req.query).forEach(key => {
    if (allowedFilters.includes(key) && req.query[key] !== undefined && req.query[key] !== '') {
      filters[key] = req.query[key];
    }
  });
  
  return filters;
};

/**
 * Parse query parameters untuk date range filtering
 * @param {Object} req - Express request object
 * @param {String} dateColumn - Nama kolom tanggal (default: 'created_at')
 * @returns {Object} Date range parameters
 */
const parseDateRange = (req, dateColumn = 'created_at') => {
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  
  return {
    startDate,
    endDate,
    dateColumn,
  };
};

/**
 * Main function untuk parse semua query parameters standar
 * @param {Object} req - Express request object
 * @param {Object} options - Konfigurasi options
 * @returns {Object} Parsed parameters
 */
const parseStandardQuery = (req, options = {}) => {
  const {
    allowedSortColumns = [],
    defaultSort = ['created_at', 'desc'],
    searchableColumns = [],
    allowedFilters = [],
    dateColumn = 'created_at',
  } = options;
  
  const pagination = parsePagination(req, defaultSort);
  const sorting = parseSorting(req, allowedSortColumns, defaultSort);
  const search = parseSearch(req, searchableColumns);
  const filters = parseFilters(req, allowedFilters);
  const dateRange = parseDateRange(req, dateColumn);
  
  return {
    pagination,
    sorting,
    search,
    filters,
    dateRange,
  };
};

/**
 * Build WHERE clause untuk search
 * @param {Object} searchParams - Search parameters dari parseSearch
 * @returns {Object} Knex where clause
 */
const buildSearchWhere = (searchParams) => {
  const { searchTerm, searchableColumns } = searchParams;
  
  if (!searchTerm || searchableColumns.length === 0) {
    return {};
  }
  
  return {
    method: 'where',
    args: [
      function() {
        searchableColumns.forEach((column, index) => {
          if (index === 0) {
            this.where(column, 'ilike', `%${searchTerm}%`);
          } else {
            this.orWhere(column, 'ilike', `%${searchTerm}%`);
          }
        });
      }
    ]
  };
};

/**
 * Build WHERE clause untuk filters
 * @param {Object} filters - Filter parameters dari parseFilters
 * @returns {Object} Knex where clause
 */
const buildFiltersWhere = (filters) => {
  const whereClause = {};
  
  Object.keys(filters).forEach(key => {
    whereClause[key] = filters[key];
  });
  
  return whereClause;
};

/**
 * Build WHERE clause untuk date range
 * @param {Object} dateRange - Date range parameters dari parseDateRange
 * @returns {Object} Knex where clause
 */
const buildDateRangeWhere = (dateRange) => {
  const { startDate, endDate, dateColumn } = dateRange;
  const whereClause = {};
  
  if (startDate) {
    whereClause[dateColumn] = whereClause[dateColumn] || {};
    whereClause[dateColumn] = { ...whereClause[dateColumn], '>=': startDate };
  }
  
  if (endDate) {
    whereClause[dateColumn] = whereClause[dateColumn] || {};
    whereClause[dateColumn] = { ...whereClause[dateColumn], '<=': endDate };
  }
  
  return whereClause;
};

/**
 * Legacy functions untuk backward compatibility
 */
const dynamicFilter = (req, column = []) => {
  const push = {};
  const asArray = Object.entries(req.query);
  const filtered = asArray.filter(([key]) => column.includes(key));
  const newObject = Object.fromEntries(filtered);

  for (const prop in newObject) {
    if (prop) {
      push[prop] = newObject[prop];
    }
  }
  return push;
};

const paging = (req, defaultOrder = []) => {
  const direction = req?.query?.direction || (defaultOrder[0] || 'created_at');
  const order = req?.query?.order || (defaultOrder[1] || 'desc');
  const page = +req?.query?.page || PAGE;
  const limit = +req?.query?.limit || LIMIT;
  const search = req?.query?.search;

  return {
    order,
    direction,
    page,
    limit,
    search,
  };
};

const dynamicFilterJoin = (req, column = []) => {
  try {
    const request = Object.entries(req.query);
    const data = {};

    for (const [i, v] of request) {
      const check = column.find((item) => item.split('.').pop() === i);

      if (check && v !== '') {
        data[check] = v;
      }
    }
    return data;
  } catch (error) {
    console.info('error dynamic filter', error);
    return {};
  }
};

const dynamicOrder = (filter = {}) => {
  let order;
  if (
    typeof filter.direction === 'string'
    && typeof filter.order === 'string'
  ) {
    order = [{ column: filter.direction, order: filter.order }];
  } else {
    const dir = filter.direction;
    const or = filter.order;
    const content = [];
    for (const a in dir) {
      content.push({ column: dir[a], order: or[a] });
    }
    order = content;
  }

  return order;
};

module.exports = {
  // New standard functions
  parseStandardQuery,
  parsePagination,
  parseSorting,
  parseSearch,
  parseFilters,
  parseDateRange,
  buildSearchWhere,
  buildFiltersWhere,
  buildDateRangeWhere,
  
  // Legacy functions for backward compatibility
  paging,
  dynamicFilter,
  dynamicFilterJoin,
  dynamicOrder,
};
