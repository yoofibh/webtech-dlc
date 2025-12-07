const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();


const pool = require('./config/db');
//  Load seedAdmin function
const seedAdmin = require('./config/seedAdmin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from /public
app.use(express.static('public'));


// Route groups 
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));

// Port from .env or default 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);

    // Seed admin user on server startup
  await seedAdmin();
});
