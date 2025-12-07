const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/books
 * Public route – list all books, with optional search & filters
 * Query params:
 *  - search (matches title or author)
 *  - category
 *  - status (available / borrowed)
 */
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;

    let baseQuery = 'SELECT * FROM books';
    const conditions = [];
    const values = [];

    if (search) {
      conditions.push('(LOWER(title) LIKE $' + (values.length + 1) + ' OR LOWER(author) LIKE $' + (values.length + 1) + ')');
      values.push(`%${search.toLowerCase()}%`);
    }

    if (category) {
      conditions.push('LOWER(category) = $' + (values.length + 1));
      values.push(category.toLowerCase());
    }

    if (status) {
      conditions.push('LOWER(status) = $' + (values.length + 1));
      values.push(status.toLowerCase());
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    baseQuery += ' ORDER BY created_at DESC';

    const result = await pool.query(baseQuery, values);

    res.json({
      count: result.rows.length,
      books: result.rows,
    });
  } catch (error) {
    console.error('Error in GET /api/books:', error.message);
    res.status(500).json({ message: 'Server error fetching books.' });
  }
});

/**
 * GET /api/books/:id
 * Public route – get single book by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;

    const result = await pool.query('SELECT * FROM books WHERE id = $1', [bookId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in GET /api/books/:id:', error.message);
    res.status(500).json({ message: 'Server error fetching book.' });
  }
});

/**
 * POST /api/books
 * Protected – admin only – create a new book
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, author, isbn, category, description, status } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: 'Title and author are required.' });
    }

    const bookStatus = status || 'available';

    const insertResult = await pool.query(
      `INSERT INTO books (title, author, isbn, category, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, author, isbn || null, category || null, description || null, bookStatus]
    );

    res.status(201).json({
      message: 'Book created successfully.',
      book: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error in POST /api/books:', error.message);
    res.status(500).json({ message: 'Server error creating book.' });
  }
});

/**
 * PUT /api/books/:id
 * Protected – admin only – update an existing book
 */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, isbn, category, description, status } = req.body;

    // First check if book exists
    const existing = await pool.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const updateResult = await pool.query(
      `UPDATE books
       SET title = $1,
           author = $2,
           isbn = $3,
           category = $4,
           description = $5,
           status = $6
       WHERE id = $7
       RETURNING *`,
      [
        title || existing.rows[0].title,
        author || existing.rows[0].author,
        isbn !== undefined ? isbn : existing.rows[0].isbn,
        category !== undefined ? category : existing.rows[0].category,
        description !== undefined ? description : existing.rows[0].description,
        status || existing.rows[0].status,
        bookId,
      ]
    );

    res.json({
      message: 'Book updated successfully.',
      book: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error in PUT /api/books/:id:', error.message);
    res.status(500).json({ message: 'Server error updating book.' });
  }
});

/**
 * DELETE /api/books/:id
 * Protected – admin only – delete a book
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;

    // Check if book exists
    const existing = await pool.query('SELECT id FROM books WHERE id = $1', [bookId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    await pool.query('DELETE FROM books WHERE id = $1', [bookId]);

    res.json({ message: 'Book deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/books/:id:', error.message);
    res.status(500).json({ message: 'Server error deleting book.' });
  }
});

module.exports = router;
