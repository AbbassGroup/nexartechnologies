const mongoose = require('mongoose');

const businessUnitSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
}, {
    collection: 'business_units', // Collection name in MongoDB
    database: 'CRM'               // Database name (optional, usually set in connection)
});

module.exports = mongoose.model('BusinessUnit', businessUnitSchema);