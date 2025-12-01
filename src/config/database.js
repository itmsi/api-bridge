/**
 * Database Configuration
 * PostgreSQL connection using Knex.js
 * 
 * Usage:
 * - const db = require('./config/database')
 * - const { pgCore } = require('./config/database')
 * 
 * Examples:
 * - db('table_name').select('*')
 * - pgCore('table_name').where({ id: 1 })
 */
const knex = require('knex');
const knexfile = require('../knexfile');

const env = process.env.NODE_ENV || 'development';
const configCore = knexfile[env];

const pgCore = knex(configCore);

/**
 * Database function wrapper
 * Allows direct usage: db(TABLE_NAME)
 * @param {string} tableName - Name of the table
 * @returns {Knex.QueryBuilder} Knex query builder instance
 */
const db = (tableName) => pgCore(tableName);

// Export db as default function (can be called directly)
// Export pgCore as named export for backward compatibility
module.exports = db;
module.exports.pgCore = pgCore;
module.exports.db = db;
