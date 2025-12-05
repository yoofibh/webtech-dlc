const { Pool } = require('pg');

// Create a connection pool using DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // needed for Render and many hosted Postgres providers
  },
});

// Function to create tables if they don't exist
const createTables = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createBooksTableQuery = `
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      author VARCHAR(150) NOT NULL,
      isbn VARCHAR(50),
      category VARCHAR(100),
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    // Test connection
    await pool.connect();
    console.log('✅ PostgreSQL connected successfully');

    // Create tables
    await pool.query(createUsersTableQuery);
    await pool.query(createBooksTableQuery);

    console.log('✅ Tables "users" and "books" are ready (created if they did not exist).');
  } catch (err) {
    console.error('❌ Error connecting to PostgreSQL or creating tables:', err.message);
  }
};

// Run the table creation when this file is loaded
createTables();

module.exports = pool;



pool
  .connect()
  .then(() => {
    console.log(' PostgreSQL connected successfully');
  })
  .catch((err) => {
    console.error(' PostgreSQL connection error:', err.message);
  });

module.exports = pool;
