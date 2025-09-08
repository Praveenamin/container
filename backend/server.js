const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3337;

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'portaluser',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'employeeportal',
  password: process.env.DB_PASSWORD || 'secretpassword',
  port: 5432,
});

app.use(cors());
app.use(express.json());

// Helper function for database query
const query = (text, params) => pool.query(text, params);

// Initialize database schema
async function initializeDb() {
  try {
    console.log("Initializing database...");
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        emp_id VARCHAR(255) UNIQUE NOT NULL,
        designation VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS it_assets (
        id SERIAL PRIMARY KEY,
        user_id INT,
        type VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        serial_number VARCHAR(255) UNIQUE NOT NULL,
        monitor VARCHAR(255),
        keyboard VARCHAR(255),
        mouse VARCHAR(255),
        wifi_lan_ip VARCHAR(255),
        comments TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Check if admin user exists, if not, create one
    const adminExists = await query('SELECT COUNT(*) FROM users WHERE is_admin = TRUE');
    if (parseInt(adminExists.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('adminpassword', 10);
      await query(
        'INSERT INTO users (first_name, last_name, email, password_hash, emp_id, designation, is_admin) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['Admin', 'User', 'admin@portal.com', hashedPassword, 'EMP-000', 'Administrator', true]
      );
      console.log('Default admin user created with email: admin@portal.com and password: adminpassword');
    }

    console.log("Database initialization complete.");
  } catch (err) {
    console.error('Error initializing database', err);
  }
}

// Simple authentication middleware
const authenticate = (req, res, next) => {
  // This is a simplified example. In a real app, you'd use sessions or JWT.
  if (req.headers.authorization === 'admin_token') {
    req.user = { id: 1, is_admin: true };
    next();
  } else {
    // For now, any other request is treated as a regular user
    req.user = { is_admin: false, id: 2 }; // Placeholder user ID
    next();
  }
};

// Admin Routes (protected by a more robust authentication in a real app)
app.post('/api/users', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  const { first_name, last_name, email, emp_id, designation, is_admin } = req.body;
  const password = 'password123'; // Default password for new users
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (first_name, last_name, email, password_hash, emp_id, designation, is_admin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [first_name, last_name, email, hashedPassword, emp_id, designation, is_admin]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  const { id } = req.params;
  const { first_name, last_name, email, emp_id, designation, is_admin } = req.body;
  try {
    const result = await query(
      'UPDATE users SET first_name = $1, last_name = $2, email = $3, emp_id = $4, designation = $5, is_admin = $6 WHERE id = $7 RETURNING *',
      [first_name, last_name, email, emp_id, designation, is_admin, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  try {
    const result = await query('SELECT id, first_name, last_name, email, emp_id, designation, is_admin FROM users ORDER BY is_admin DESC, first_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  const { user_id, type, model, serial_number, monitor, keyboard, mouse, wifi_lan_ip, comments } = req.body;
  try {
    const result = await query(
      'INSERT INTO it_assets (user_id, type, model, serial_number, monitor, keyboard, mouse, wifi_lan_ip, comments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [user_id, type, model, serial_number, monitor, keyboard, mouse, wifi_lan_ip, comments]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  const { id } = req.params;
  const { user_id, type, model, serial_number, monitor, keyboard, mouse, wifi_lan_ip, comments } = req.body;
  try {
    const result = await query(
      'UPDATE it_assets SET user_id = $1, type = $2, model = $3, serial_number = $4, monitor = $5, keyboard = $6, mouse = $7, wifi_lan_ip = $8, comments = $9 WHERE id = $10 RETURNING *',
      [user_id, type, model, serial_number, monitor, keyboard, mouse, wifi_lan_ip, comments, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  const { id } = req.params;
  try {
    await query('DELETE FROM it_assets WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/assets', async (req, res) => {
  // if (!req.user.is_admin) return res.status(403).send('Forbidden');
  try {
    const result = await query('SELECT a.*, u.first_name, u.last_name, u.emp_id FROM it_assets a LEFT JOIN users u ON a.user_id = u.id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  await initializeDb();
  console.log(`Backend server running on port ${PORT}`);
});

