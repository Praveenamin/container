const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3337;

app.use(cors());
app.use(bodyParser.json());

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
});

// Check database connection and create users table if it doesn't exist
const initializeDatabase = async () => {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                emp_id VARCHAR(255),
                designation VARCHAR(255),
                is_admin BOOLEAN DEFAULT FALSE,
                assets JSONB DEFAULT '[]'::jsonb
            );
        `);

        // Check for default admin and create if it doesn't exist
        const adminCount = await client.query('SELECT COUNT(*) FROM users WHERE email = $1', ['admin@portal.com']);
        if (parseInt(adminCount.rows[0].count) === 0) {
            const adminPassword = 'adminpassword';
            const salt = await bcrypt.genSalt(10);
            const adminPasswordHash = await bcrypt.hash(adminPassword, salt);
            await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, emp_id, designation, is_admin)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['admin@portal.com', adminPasswordHash, 'Admin', 'User', '0001', 'Administrator', true]
            );
            console.log('Default admin user created.');
        }

        client.release();
        console.log('Database connected and initialized.');
    } catch (err) {
        console.error('Error connecting to or initializing the database', err);
    }
};

initializeDatabase();

// --- API ROUTES ---

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
            const userData = {
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                empId: user.emp_id,
                designation: user.designation,
                admin: user.is_admin,
                assets: user.assets
            };
            res.json(userData);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// User CRUD operations
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id');
        const users = result.rows.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            empId: user.emp_id,
            designation: user.designation,
            admin: user.is_admin,
        }));
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/users', async (req, res) => {
    const { email, password, firstName, lastName, empId, designation, admin } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, emp_id, designation, is_admin, assets)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [email, passwordHash, firstName, lastName, empId, designation, admin, '[]']
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { email, password, firstName, lastName, empId, designation, admin } = req.body;

    try {
        let updateQuery = `UPDATE users SET email=$1, first_name=$2, last_name=$3, emp_id=$4, designation=$5, is_admin=$6`;
        const queryParams = [email, firstName, lastName, empId, designation, admin, userId];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            updateQuery += `, password_hash=$7`;
            queryParams.splice(6, 0, passwordHash);
        }

        updateQuery += ` WHERE id=$${queryParams.length}`;
        await pool.query(updateQuery, queryParams);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Asset CRUD operations
app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id AS user_id,
                u.email AS user_email,
                u.first_name,
                u.last_name,
                json_agg(jsonb_build_object('name', a.asset_name, 'type', a.asset_type)) AS assets
            FROM users u
            JOIN LATERAL jsonb_array_elements(u.assets) AS a(asset) ON true
            GROUP BY u.id, u.email, u.first_name, u.last_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching assets:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/assets', async (req, res) => {
    const { userId, assetName, assetType } = req.body;
    try {
        await pool.query(
            `UPDATE users SET assets = assets || $1::jsonb WHERE id = $2`,
            [`[{"asset_name": "${assetName}", "asset_type": "${assetType}"}]`, userId]
        );
        res.status(201).json({ message: 'Asset assigned successfully' });
    } catch (err) {
        console.error('Error assigning asset:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/assets/:userId/:assetName', async (req, res) => {
    const { userId, assetName } = req.params;
    try {
        await pool.query(
            `UPDATE users SET assets = assets - (
                SELECT idx FROM users u, jsonb_array_elements(u.assets) WITH ORDINALITY arr(elem, idx)
                WHERE u.id = $1 AND elem->>'asset_name' = $2
            ) WHERE id = $1`,
            [userId, assetName]
        );
        res.json({ message: 'Asset unassigned successfully' });
    } catch (err) {
        console.error('Error unassigning asset:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

