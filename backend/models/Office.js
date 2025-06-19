const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
}, {
    collection: 'offices', // Collection name in MongoDB
    database: 'CRM'        // Database name (optional, usually set in connection)
});

module.exports = mongoose.model('Office', officeSchema);