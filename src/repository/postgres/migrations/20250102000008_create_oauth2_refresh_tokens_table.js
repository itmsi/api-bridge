/**
 * Migration: Create oauth2_refresh_tokens table
 * Tabel untuk menyimpan refresh token OAuth2 untuk API clients
 */

exports.up = function(knex) {
  return knex.schema.createTable('oauth2_refresh_tokens', (table) => {
    // Primary Key
    table.increments('id').primary();
    
    // Foreign key ke api_clients
    table.integer('api_client_id').unsigned().notNullable();
    table.foreign('api_client_id').references('id').inTable('api_clients').onDelete('CASCADE');
    
    // Refresh token (unique)
    table.string('refresh_token', 500).notNullable().unique();
    
    // JWT ID (jti) dari access token terkait
    table.string('jti', 255).notNullable();
    
    // Status
    table.boolean('is_revoked').defaultTo(false);
    
    // Expiration
    table.timestamp('expires_at', { useTz: true }).notNullable();
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('revoked_at', { useTz: true }).nullable();
    
    // Indexes
    table.index(['refresh_token'], 'idx_oauth2_refresh_tokens_token');
    table.index(['api_client_id'], 'idx_oauth2_refresh_tokens_client');
    table.index(['jti'], 'idx_oauth2_refresh_tokens_jti');
    table.index(['is_revoked', 'expires_at'], 'idx_oauth2_refresh_tokens_status');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('oauth2_refresh_tokens');
};

