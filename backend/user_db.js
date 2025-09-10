const bcrypt = require('bcryptjs');

// Hash for 'adminpassword' - DO NOT USE THIS IN PRODUCTION
const adminPasswordHash = '$2a$10$w6zK4/H.Uj4Nf8.g/4v9hO2hR7F.p8c4K8n5N.J9N2N0T0S0/p4O';

const users = [
    {
        id: '1',
        email: 'admin@portal.com',
        password: adminPasswordHash, // The bcrypt hash for 'adminpassword'
        firstName: 'Admin',
        lastName: 'User',
        empId: '0001',
        designation: 'Administrator',
        admin: true,
        assets: []
    },
];

module.exports = { users };

