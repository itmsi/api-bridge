/**
 * Migration: Create sync_jobs table
 * Tabel untuk tracking job sync yang sedang berjalan atau sudah selesai
 */

exports.up = function(knex) {
  return knex.schema.createTable('sync_jobs', (table) => {
    // Primary Key
    table.increments('id').primary();
    
    // Job ID (UUID untuk tracking job)
    table.uuid('job_id').notNullable().unique();
    
    // Module yang di-sync
    table.string('module', 100).notNullable();
    
    // Parameters job (JSON)
    table.jsonb('params').nullable();
    
    // Status job: pending, processing, success, failed
    table.string('status', 50).defaultTo('pending');
    
    // Jumlah attempts
    table.integer('attempts').defaultTo(0);
    
    // Error message terakhir
    table.text('last_error').nullable();
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('started_at', { useTz: true }).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();
    
    // Indexes
    table.index(['job_id'], 'idx_sync_jobs_job_id');
    table.index(['module'], 'idx_sync_jobs_module');
    table.index(['status'], 'idx_sync_jobs_status');
    table.index(['created_at'], 'idx_sync_jobs_created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sync_jobs');
};

