const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Resilient database connection and initialization
async function initializeDatabase() {
  const RETRY_INTERVAL = 5000;
  const MAX_RETRIES = 10;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to the database.');
      // Create the users table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL
        );
      `);
      
      // Check if the default admin user exists
      const res = await client.query('SELECT * FROM users WHERE email = $1', ['admin@portal.com']);
      if (res.rowCount === 0) {
        const passwordHash = await bcrypt.hash('adminpassword', 10);
        await client.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
          ['admin@portal.com', passwordHash, 'admin']
        );
        console.log('Default admin user created.');
      }
      client.release();
      return; // Success, exit the loop
    } catch (err) {
      console.error(`Attempt ${retries + 1} to connect to the database failed. Retrying in ${RETRY_INTERVAL / 1000} seconds...`);
      retries++;
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    }
  }

  console.error('Failed to connect to the database after multiple retries. Exiting.');
  process.exit(1);
}

// Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        res.status(200).json({ message: 'Login successful', user: { email: user.email, role: user.role } });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'An error occurred during login.' });
  }
});

// Start the server after the database is initialized
initializeDatabase().then(() => {
  app.listen(3337, () => {
    console.log('Server is running on http://localhost:3337');
  });
}).catch(err => {
  console.error('Failed to initialize server due to database connection issues.');
});

