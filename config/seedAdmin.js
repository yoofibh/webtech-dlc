const pool = require('./db');
const bcrypt = require('bcryptjs');

// This function:
// 1. Checks if an admin user already exists
// 2. If not, creates a default admin: ybh@example.com / ybh123!
const seedAdmin = async () => {
  try {
    // 1. Check if any admin exists
    const result = await pool.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (result.rows.length > 0) {
      console.log('✔ Admin already exists, skipping admin seed.');
      return;
    }

    // 2. No admin found → create one
    const email = 'ybh@example.com';
    const plainPassword = 'ybh123!';
    const name = 'Adminbh User';

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [name, email, passwordHash, 'admin']
    );

    console.log(' Seed admin created: admin@example.com / Admin123!');
  } catch (error) {
    console.error(' Error seeding admin user:', error.message);
  }
};

module.exports = seedAdmin;
