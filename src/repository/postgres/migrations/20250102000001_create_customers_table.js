/**
 * Migration: Create customers table
 * Tabel untuk menyimpan data customer yang di-sync dari NetSuite
 */

exports.up = function(knex) {
  return knex.schema.createTable('customers', (table) => {
    // Primary Key
    table.increments('id').primary();
    
    // NetSuite ID (unique identifier dari NetSuite)
    table.string('netsuite_id', 255).notNullable().unique();
    
    // Customer data
    table.text('name').notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 50).nullable();
    
    // Raw JSON payload dari NetSuite
    table.jsonb('data').nullable();
    
    // Timestamps untuk tracking perubahan
    table.timestamp('last_modified_netsuite', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Soft delete
    table.boolean('is_deleted').defaultTo(false);
    
    // Indexes untuk performa query
    table.index(['netsuite_id'], 'idx_customers_netsuite_id');
    table.index(['email'], 'idx_customers_email');
    table.index(['last_modified_netsuite'], 'idx_customers_last_modified');
    table.index(['is_deleted'], 'idx_customers_is_deleted');
    table.index(['updated_at'], 'idx_customers_updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('customers');
};

