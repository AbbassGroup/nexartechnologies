const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  stage: { type: String, required: true, trim: true },
  owner: { type: String, required: true, trim: true }, // or reference to User
  businessUnit: { type: String, required: true, trim: true },
  office: { type: String, required: true, trim: true },
  // Add any other fields you need (amount, notes, etc.)
}, {
  timestamps: true,
  collection: 'deals'
});

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;