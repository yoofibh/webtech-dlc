// resetBorrowData.js
require('dotenv').config();
const pool = require('./config/db');

(async () => {
  try {
    // 1. Set all books back to 'available'
    await pool.query(`UPDATE books SET status = 'available'`);

    // 2. Clear all borrow records
    await pool.query(`TRUNCATE borrow_records RESTART IDENTITY`);

    console.log('Reset done: all books set to available, borrow_records cleared.');
  } catch (err) {
    console.error('Error during reset:', err.message);
  } finally {
    process.exit();
  }
})();
