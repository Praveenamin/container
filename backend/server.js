const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3337;
const JWT_SECRET = 'your-secret-key'; // In a real app, use a strong, environment variable

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory "database" for demonstration
const users = [
    { id: 1, first_name: 'John', last_name: 'Doe', email: 'admin@example.com', password: 'password123', is_admin: true, emp_id: 'A001', designation: 'Administrator' },
    { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', password: 'password123', is_admin: false, emp_id: 'E001', designation: 'Software Engineer' },
];

const assets = [
    { id: 1, user_id: 2, type: 'Laptop', model: 'Dell XPS 15', serial_number: 'SN-001', monitor: 'Dell P2419H', keyboard: 'Logitech K120', mouse: 'Logitech M185', wifi_lan_ip: '192.168.1.101', comments: 'Standard issue for new hires.' },
    { id: 2, user_id: 2, type: 'Desktop', model: 'HP Spectre', serial_number: 'SN-002', monitor: 'Samsung 4K', keyboard: 'Apple Magic Keyboard', mouse: 'Apple Magic Mouse', wifi_lan_ip: '192.168.1.102', comments: 'High-performance machine.' },
    { id: 3, user_id: null, type: 'Laptop', model: 'MacBook Pro', serial_number: 'SN-003', monitor: null, keyboard: null, mouse: null, wifi_lan_ip: null, comments: 'Unassigned, ready for deployment.' },
];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// API Routes
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        const token = jwt.sign({ id: user.id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin, first_name: user.first_name, last_name: user.last_name, emp_id: user.emp_id, designation: user.designation } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// User Profile
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// User Assets
app.get('/api/my_assets', authenticateToken, (req, res) => {
    const userAssets = assets.filter(a => a.user_id === req.user.id);
    res.json(userAssets);
});

// Admin Routes (protected)
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
    res.json(users);
});

app.post('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
    const newUser = { id: users.length + 1, ...req.body, is_admin: !!req.body.is_admin };
    users.push(newUser);
    res.status(201).json(newUser);
});

app.put('/api/users/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    users[userIndex] = { ...users[userIndex], ...req.body };
    res.json(users[userIndex]);
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    users.splice(userIndex, 1);
    res.status(204).end();
});

app.get('/api/assets', authenticateToken, authorizeAdmin, (req, res) => {
    const assetsWithUserInfo = assets.map(asset => {
        const user = users.find(u => u.id === asset.user_id);
        return {
            ...asset,
            first_name: user ? user.first_name : null,
            last_name: user ? user.last_name : null,
            emp_id: user ? user.emp_id : null,
        };
    });
    res.json(assetsWithUserInfo);
});

app.post('/api/assets', authenticateToken, authorizeAdmin, (req, res) => {
    const newAsset = { id: assets.length + 1, ...req.body, user_id: req.body.user_id ? parseInt(req.body.user_id) : null };
    assets.push(newAsset);
    res.status(201).json(newAsset);
});

app.put('/api/assets/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const assetIndex = assets.findIndex(a => a.id === parseInt(req.params.id));
    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }
    assets[assetIndex] = { ...assets[assetIndex], ...req.body, user_id: req.body.user_id ? parseInt(req.body.user_id) : null };
    res.json(assets[assetIndex]);
});

app.delete('/api/assets/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const assetIndex = assets.findIndex(a => a.id === parseInt(req.params.id));
    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }
    assets.splice(assetIndex, 1);
    res.status(204).end();
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

