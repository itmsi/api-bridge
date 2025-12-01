/**
 * Seeder: Default NetSuite Scripts Configuration
 * Data default untuk konfigurasi script ID NetSuite
 */

exports.seed = async function(knex) {
  // Delete all existing entries
  await knex('netsuite_scripts').del();
  
  // Insert default scripts berdasarkan Postman collection
  await knex('netsuite_scripts').insert([
    {
      module: 'customer',
      operation: 'read',
      script_id: '472',
      deployment_id: '1',
      description: 'Customer (Read) - Read customer from NetSuite',
      is_active: true,
    },
    {
      module: 'customer',
      operation: 'create',
      script_id: '472',
      deployment_id: '1',
      description: 'Customer (Create) - Create new customer in NetSuite',
      is_active: true,
    },
    {
      module: 'customer',
      operation: 'update',
      script_id: '472',
      deployment_id: '1',
      description: 'Customer (Edit) - Update customer in NetSuite',
      is_active: true,
    },
    {
      module: 'customer',
      operation: 'getPage',
      script_id: '532',
      deployment_id: '1',
      description: 'Get Customer Page - Get paginated customer list from NetSuite',
      is_active: true,
    },
  ]);
};

