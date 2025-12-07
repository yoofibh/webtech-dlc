// updateAdmin.js
// This script updates the existing admin's email and password.

const dotenv = require('dotenv');
dotenv.config();

const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const OLD_EMAIL = 'dlcadmin1@example.com';        // current email in DB
const NEW_EMAIL = 'ybh@example.com';   // new email you want
const NEW_PASSWORD = 'ybh123!';         // new plain password you want

(async () => {
  try {
    console.log('🔎 Looking for admin with email:', OLD_EMAIL);

    // 1. Try to find the admin by old email
    let result = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [OLD_EMAIL]
    );

    // If not found by email, try by role = 'admin'
    if (result.rows.length === 0) {
      console.log(`No user found with email ${OLD_EMAIL}. Trying by role 'admin'...`);
      result = await pool.query(
        "SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1"
      );
    }

    if (result.rows.length === 0) {
      console.log(' No admin user found at all. Nothing to update.');
      process.exit(0);
    }

    const admin = result.rows[0];
    console.log(' Found admin:', admin);

    // 2. Hash the new password
    const newHash = await bcrypt.hash(NEW_PASSWORD, 10);

    // 3. Update this admin row with new email + password_hash
    await pool.query(
      'UPDATE users SET email = $1, password_hash = $2 WHERE id = $3',
      [NEW_EMAIL, newHash, admin.id]
    );

    console.log('Admin updated successfully!');
    console.log('➡ New login email:', NEW_EMAIL);
    console.log('➡ New password:', NEW_PASSWORD);

    process.exit(0);
  } catch (err) {
    console.error(' Error updating admin:', err.message);
    process.exit(1);
  }
})();
