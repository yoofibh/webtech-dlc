const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// REGISTER route: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default role = student unless admin is explicitly set
    const userRole = role === 'admin' ? 'admin' : 'student';

    // Insert into database
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, userRole]
    );

    const newUser = insertResult.rows[0];

    // Remove password_hash before sending to frontend
    const { password_hash, ...safeUser } = newUser;

    // Create JWT
    const token = jwt.sign(
      { id: safeUser.id, role: safeUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully.',
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error('Error in /register:', error.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// LOGIN route: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Get user from DB
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = userResult.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Remove password_hash before sending to frontend
    const { password_hash, ...safeUser } = user;

    // Sign token
    const token = jwt.sign(
      { id: safeUser.id, role: safeUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error('Error in /login:', error.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;
