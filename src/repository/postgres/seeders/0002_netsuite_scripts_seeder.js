/**
 * Seeder: Default NetSuite Scripts Configuration
 * Data default untuk konfigurasi script ID NetSuite
 */

exports.seed = async function(knex) {
  // Delete all existing entries
  await knex('netsuite_scripts').del();
  
  // Insert default scripts berdasarkan Postman collection
  // Sekarang menggunakan script ID per module (bukan per operation)
  // Module customer menggunakan script ID 532 untuk semua operasi
  await knex('netsuite_scripts').insert([
    {
      module: 'customer',
      operation: 'default', // Operation default untuk module
      script_id: '532',
      deployment_id: '1',
      description: 'Customer Module - Script ID untuk semua operasi CRUD customer',
      is_active: true,
    },
    {
      module: 'vendor',
      operation: 'default', // Operation default untuk module
      script_id: '533',
      deployment_id: '1',
      description: 'Vendor Module - Script ID untuk semua operasi CRUD vendor',
      is_active: true,
    },
  ]);
};

