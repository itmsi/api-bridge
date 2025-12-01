/**
 * Migration: Create sync_tracker table
 * Tabel untuk tracking status sync terakhir untuk setiap module
 */

exports.up = function(knex) {
  return knex.schema.createTable('sync_tracker', (table) => {
    // Primary Key
    table.increments('id').primary();
    
    // Module name (customer, product, dll)
    table.string('module', 100).notNullable().unique();
    
    // Timestamp sync terakhir
    table.timestamp('last_sync_at', { useTz: true }).nullable();
    
    // Timestamp maximum dari batch terakhir yang di-sync
    table.timestamp('last_synced_batch_max', { useTz: true }).nullable();
    
    // Status sync
    table.string('status', 50).defaultTo('idle'); // idle, syncing, success, failed
    
    // Remark/notes
    table.text('remark').nullable();
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['module'], 'idx_sync_tracker_module');
    table.index(['status'], 'idx_sync_tracker_status');
    table.index(['last_sync_at'], 'idx_sync_tracker_last_sync');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sync_tracker');
};

