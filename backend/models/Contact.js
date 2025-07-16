const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  industry: { type: String },
  businessType: { type: String },
  priceRange: { type: String },
  location: { type: String },
  city: { type: String },
  caSigned: { type: String, default: '' },
  contactOwner: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema); 