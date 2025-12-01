/**
 * Migration: Create netsuite_scripts table
 * Tabel untuk menyimpan konfigurasi script ID NetSuite per module dan operation
 */

exports.up = function(knex) {
  return knex.schema.createTable('netsuite_scripts', (table) => {
    // Primary Key
    table.increments('id').primary();
    
    // Module name (e.g., 'customer', 'order', 'item')
    table.string('module', 100).notNullable();
    
    // Operation name (e.g., 'read', 'create', 'update', 'getPage', 'search')
    table.string('operation', 100).notNullable();
    
    // NetSuite Script ID
    table.string('script_id', 50).notNullable();
    
    // NetSuite Deployment ID (default: '1')
    table.string('deployment_id', 50).defaultTo('1');
    
    // Description
    table.text('description').nullable();
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Unique constraint: satu script per module + operation
    table.unique(['module', 'operation'], 'idx_netsuite_scripts_module_operation');
    
    // Indexes untuk performa query
    table.index(['module'], 'idx_netsuite_scripts_module');
    table.index(['operation'], 'idx_netsuite_scripts_operation');
    table.index(['is_active'], 'idx_netsuite_scripts_is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('netsuite_scripts');
};

