const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  // Common fields for all business units
  name: { type: String, required: true, trim: true },
  stage: { type: String, required: true, trim: true },
  owner: { type: String, required: true, trim: true },
  businessUnit: { type: String, required: true, trim: true },
  office: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  dateCreated: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  commission: { type: String, trim: true },
  referralPartner: { type: String, trim: true },
  campaign: { type: String, trim: true },
  
  // Business Brokers specific fields
  businessName: { type: String, trim: true },
  typeOfBusiness: { type: String, trim: true },
  sellingConsideration: { type: String, trim: true },
  lengthOfOperation: { type: String, trim: true },
  location: { type: String, trim: true },
  listingAgent: { type: String, trim: true },
  sellingAgent: { type: String, trim: true },
  
  // Global Properties specific fields
  member: { type: String, enum: ['No', 'Yes', 'Refunded'], default: 'No' },
  
  // Legacy fields (keeping for backward compatibility)
  leadStatus: { type: String, trim: true },
  accountName: { type: String, trim: true },
  type: { type: String, trim: true },
  nextStep: { type: String, trim: true },
  leadSource: { type: String, trim: true },
  contactName: { type: String, trim: true },
  whereBased: { type: String, trim: true },
  whereToBuy: { type: String, trim: true },
  agreement: { type: String, trim: true },
  agreementTerms: { type: String, trim: true },
  listingPrice: { type: String, trim: true },
  salesCommission: { type: String, trim: true },
  closingDate: { type: String, trim: true },
  probability: { type: Number, default: 0 },
  expectedRevenue: { type: String, trim: true },
  campaignSource: { type: String, trim: true },
  whenToBuy: { type: String, trim: true },
  comments: { type: String, trim: true },
  
  // ABBASS Group specific fields
  abbassBusinessUnit: { type: String, trim: true },
  abbassBusinessType: { type: String, trim: true },
  
  // Tracking fields
  lastModifiedBy: { type: String, trim: true },
  lastModifiedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'deals'
});

// Pre-save middleware to validate business unit specific required fields
dealSchema.pre('save', function(next) {
  // Business Brokers specific validation
  if (this.businessUnit === 'Business Brokers') {
    if (!this.businessName || this.businessName.trim() === '') {
      return next(new Error('Business name is required for Business Brokers deals'));
    }
  }
  
  next();
});

// Pre-update middleware for the same validation
dealSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Business Brokers specific validation
  if (update.businessUnit === 'Business Brokers' || 
      (this._conditions._id && update.businessUnit === 'Business Brokers')) {
    if (!update.businessName || update.businessName.trim() === '') {
      return next(new Error('Business name is required for Business Brokers deals'));
    }
  }
  
  next();
});

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;