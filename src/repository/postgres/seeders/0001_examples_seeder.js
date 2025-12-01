/**
 * Seeder: Example data
 * This is an example seeder file
 */

exports.seed = async function(knex) {
  // Delete all existing entries (optional)
  await knex('examples').del();
  
  // Insert seed data
  await knex('examples').insert([
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Example 1',
      description: 'This is the first example item',
      status: 'active',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Example 2',
      description: 'This is the second example item',
      status: 'active',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Example 3',
      description: 'This is the third example item',
      status: 'inactive',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};

