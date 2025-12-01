/**
 * Query Builder Utility untuk membantu repository menggunakan filter standar
 */

/**
 * Apply pagination ke query builder
 * @param {Object} queryBuilder - Knex query builder
 * @param {Object} pagination - Pagination parameters dari parsePagination
 * @returns {Object} Query builder dengan pagination
 */
const applyPagination = (queryBuilder, pagination) => {
  return queryBuilder
    .limit(pagination.limit)
    .offset(pagination.offset);
};

/**
 * Apply sorting ke query builder
 * @param {Object} queryBuilder - Knex query builder
 * @param {Object} sorting - Sorting parameters dari parseSorting
 * @returns {Object} Query builder dengan sorting
 */
const applySorting = (queryBuilder, sorting) => {
  return queryBuilder.orderBy(sorting.sortBy, sorting.sortOrder);
};

/**
 * Apply search ke query builder
 * @param {Object} queryBuilder - Knex query builder
 * @param {Object} search - Search parameters dari parseSearch
 * @returns {Object} Query builder dengan search
 */
const applySearch = (queryBuilder, search) => {
  const { searchTerm, searchableColumns } = search;
  
  if (!searchTerm || searchableColumns.length === 0) {
    return queryBuilder;
  }
  
  return queryBuilder.where(function() {
    searchableColumns.forEach((column, index) => {
      if (index === 0) {
        this.where(column, 'ilike', `%${searchTerm}%`);
      } else {
        this.orWhere(column, 'ilike', `%${searchTerm}%`);
      }
    });
  });
};

/**
 * Apply filters ke query builder
 * @param {Object} queryBuilder - Knex query builder
 * @param {Object} filters - Filter parameters dari parseFilters
 * @returns {Object} Query builder dengan filters
 */
const applyFilters = (queryBuilder, filters) => {
  Object.keys(filters).forEach(key => {
    queryBuilder.where(key, filters[key]);
  });
  
  return queryBuilder;
};

/**
 * Apply date range ke query builder
 * @param {Object} queryBuilder - Knex query builder
 * @param {Object} dateRange - Date range parameters dari parseDateRange
 * @returns {Object} Query builder dengan date range
 */
const applyDateRange = (queryBuilder, dateRange) => {
  const { startDate, endDate, dateColumn } = dateRange;
  
  if (startDate) {
    queryBuilder.where(dateColumn, '>=', startDate);
  }
  
  if (endDate) {
    queryBuilder.where(dateColumn, '<=', endDate);
  }
  
  return queryBuilder;
};

/**
 * Apply semua filter standar ke query builder
 * @param {Object} queryBuilder - Knex query builder
 * @param {Object} queryParams - Parsed query parameters dari parseStandardQuery
 * @returns {Object} Query builder dengan semua filter
 */
const applyStandardFilters = (queryBuilder, queryParams) => {
  const { pagination, sorting, search, filters, dateRange } = queryParams;
  
  // Apply search first
  queryBuilder = applySearch(queryBuilder, search);
  
  // Apply filters
  queryBuilder = applyFilters(queryBuilder, filters);
  
  // Apply date range
  queryBuilder = applyDateRange(queryBuilder, dateRange);
  
  // Apply sorting
  queryBuilder = applySorting(queryBuilder, sorting);
  
  // Apply pagination last
  queryBuilder = applyPagination(queryBuilder, pagination);
  
  return queryBuilder;
};

/**
 * Build count query untuk pagination metadata
 * @param {Object} baseQuery - Base query builder tanpa pagination
 * @param {Object} queryParams - Parsed query parameters dari parseStandardQuery
 * @returns {Object} Count query builder
 */
const buildCountQuery = (baseQuery, queryParams) => {
  const { search, filters, dateRange } = queryParams;
  
  // Clone base query dan hapus select untuk count
  let countQuery = baseQuery.clone().clearSelect();
  
  // Apply search
  countQuery = applySearch(countQuery, search);
  
  // Apply filters
  countQuery = applyFilters(countQuery, filters);
  
  // Apply date range
  countQuery = applyDateRange(countQuery, dateRange);
  
  return countQuery.count('* as total');
};

/**
 * Format response dengan pagination metadata
 * @param {Array} data - Data hasil query
 * @param {Object} pagination - Pagination parameters
 * @param {Number} total - Total records
 * @returns {Object} Formatted response dengan pagination metadata
 */
const formatPaginatedResponse = (data, pagination, total) => {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    data,
    pagination: {
      current_page: pagination.page,
      per_page: pagination.limit,
      total: parseInt(total),
      total_pages: totalPages,
      has_next_page: pagination.page < totalPages,
      has_prev_page: pagination.page > 1,
    }
  };
};

module.exports = {
  applyPagination,
  applySorting,
  applySearch,
  applyFilters,
  applyDateRange,
  applyStandardFilters,
  buildCountQuery,
  formatPaginatedResponse,
};
