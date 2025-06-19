const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    businessUnit: { type: String, required: true },
    office: { type: String, required: true }
}, {
    collection: 'admin_details',
    database: 'CRM'
});

module.exports = mongoose.model('Admin', adminSchema);