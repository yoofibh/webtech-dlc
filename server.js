const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();


const pool = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  res.send('Digital Library Catalogue API is running ');
});

// Route groups 
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));

// Port from .env or default 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
