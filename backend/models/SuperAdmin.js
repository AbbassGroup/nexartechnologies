const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    role:      { type: String, default: 'super_admin' },
    businessUnit: { type: String, required: true },
    office:    { type: String, required: true }
}, {
    collection: 'super_admin',
    database: 'CRM'
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);