const bcrypt = require('bcryptjs');

const plainPassword = 'DlcAdmin123!'; //  password editor

(async () => {
  try {
    const hash = await bcrypt.hash(plainPassword, 10);
    console.log('New password:', plainPassword);
    console.log('Hashed password:', hash);
  } catch (err) {
    console.error('Error hashing password:', err.message);
  }
})();
