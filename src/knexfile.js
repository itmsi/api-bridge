const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

module.exports = {
  development: {
    client: process.env.DB_CLIENT_DEV,
    connection: {
      host: process.env.DB_HOST_DEV,
      port: process.env.DB_PORT_DEV,
      user: process.env.DB_USER_DEV,
      password: process.env.DB_PASS_DEV,
      database: process.env.DB_NAME_DEV,
    },
    debug: false,
    migrations: {
      tableName: 'migrations',
      directory: path.join(__dirname, 'repository/postgres/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'repository/postgres/seeders'),
    }
  },
  production: {
    client: process.env.DB_CLIENT_PROD,
    connection: {
      host: process.env.DB_HOST_PROD,
      port: process.env.DB_PORT_PROD,
      user: process.env.DB_USER_PROD,
      password: process.env.DB_PASS_PROD,
      database: process.env.DB_NAME_PROD,
    },
    debug: process.env.NODE_ENV !== 'production',
    migrations: {
      tableName: 'migrations',
      directory: path.join(__dirname, 'repository/postgres/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'repository/postgres/seeders'),
    }
  },
  staging: {
    client: process.env.DB_CLIENT_TEST,
    connection: {
      host: process.env.DB_HOST_TEST,
      port: process.env.DB_PORT_TEST,
      user: process.env.DB_USER_TEST,
      password: process.env.DB_PASS_TEST,
      database: process.env.DB_NAME_TEST,
    },
    debug: true,
    migrations: {
      tableName: 'migrations',
      directory: path.join(__dirname, 'repository/postgres/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'repository/postgres/seeders'),
    }
  }
}
