/**
 * Migration: Create failed_jobs table
 * Tabel untuk menyimpan job yang gagal setelah melewati retry limit
 */

exports.up = function(knex) {
  return knex.schema.createTable('failed_jobs', (table) => {
    // Primary Key
    table.increments('id').primary();
    
    // Job ID
    table.uuid('job_id').notNullable();
    
    // Module
    table.string('module', 100).notNullable();
    
    // Payload job (JSON)
    table.jsonb('payload').nullable();
    
    // Error message
    table.text('error').nullable();
    
    // Stack trace
    table.text('stack_trace').nullable();
    
    // Attempts sebelum gagal
    table.integer('attempts').defaultTo(0);
    
    // Timestamp
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['job_id'], 'idx_failed_jobs_job_id');
    table.index(['module'], 'idx_failed_jobs_module');
    table.index(['created_at'], 'idx_failed_jobs_created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('failed_jobs');
};

