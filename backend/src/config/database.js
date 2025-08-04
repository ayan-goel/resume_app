require('dotenv').config();

module.exports = {
  development: {
    // Use DATABASE_URL if available (for Railway), otherwise use individual variables
    use_env_variable: process.env.DATABASE_URL ? 'DATABASE_URL' : undefined,
    username: process.env.DB_USER || process.env.PGUSER,
    password: process.env.DB_PASS || process.env.PGPASSWORD,
    database: process.env.DB_NAME || process.env.PGDATABASE,
    host: process.env.DB_HOST || process.env.PGHOST,
    port: process.env.DB_PORT || process.env.PGPORT,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DATABASE_URL ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  },
  production: {
    // Use DATABASE_URL if available (Railway provides this)
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
}; 