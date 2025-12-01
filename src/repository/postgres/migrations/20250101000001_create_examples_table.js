/**
 * Migration: Create examples table
 * This is an example migration file showing the structure
 */

exports.up = function(knex) {
  return knex.schema.createTable('examples', (table) => {
    // Primary Key with UUID
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Data fields
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.string('status', 20).defaultTo('active');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    // Indexes for better query performance
    table.index(['deleted_at'], 'idx_examples_deleted_at');
    table.index(['status'], 'idx_examples_status');
    table.index(['created_at'], 'idx_examples_created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('examples');
};

