import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Deals.css';
import '../styles/CreateDeal.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const initialState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  industry: '',
  businessType: '',
  priceRange: '',
  location: '',
  city: '',
  contactOwner: '',
};

const CreateContact = () => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!form.firstName || !form.lastName || !form.phone || !form.email) {
        setError('First name, last name, phone, and email are required.');
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create contact');
      }
      navigate('/admin-dashboard/prospects');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deals-container">
      <div className="deals-header">
        <h2>Create Contact</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group-row">
          <div className="form-group">
            <label>Phone *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group-row">
          <div className="form-group">
            <label>Industry</label>
            <input name="industry" value={form.industry} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Business Type</label>
            <input name="businessType" value={form.businessType} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group-row">
          <div className="form-group">
            <label>Price Range</label>
            <input name="priceRange" value={form.priceRange} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input name="location" value={form.location} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group-row">
          <div className="form-group">
            <label>City</label>
            <input name="city" value={form.city} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Contact Owner</label>
            <input name="contactOwner" value={form.contactOwner} onChange={handleChange} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/prospects')}>Cancel</button>
          <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Contact'}</button>
        </div>
      </form>
    </div>
  );
};

export default CreateContact; 