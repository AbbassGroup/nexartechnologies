const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        trim: true,
        enum: ['super_admin', 'admin', 'manager'], // Updated to match your requirements
        default: 'User'
    },
    businessUnit: {
        type: String,
        required: true,
        trim: true
    },
    office: {  // Changed from officeLocation to office
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'users', // This specifies the collection name
    database: 'CRM' 
});

const User = mongoose.model('User', userSchema);

module.exports = User; 



