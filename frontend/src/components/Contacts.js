import React, { useEffect, useState } from 'react';
import '../styles/Deals.css';
import '../styles/CreateDeal.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Contacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  // Check if user can access Prospects
  const canAccessProspects = () => {
    if (!user) return false;
    
    // Super admin and admin can always access
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }
    
    // Managers can only access if they belong to Business Brokers business unit
    if (user.role === 'manager') {
      return user.businessUnits && user.businessUnits.includes('Business Brokers');
    }
    
    return false;
  };

  // Redirect unauthorized users
  useEffect(() => {
    if (!canAccessProspects()) {
      navigate('/admin-dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (canAccessProspects()) {
      fetchContacts();
    }
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredContacts(contacts);
    } else {
      const lower = search.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          c =>
            (c.firstName && c.firstName.toLowerCase().includes(lower)) ||
            (c.lastName && c.lastName.toLowerCase().includes(lower))
        )
      );
    }
  }, [search, contacts]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts`);
      const data = await response.json();
      setContacts(data.data || []);
      setFilteredContacts(data.data || []);
    } catch (error) {
      setContacts([]);
      setFilteredContacts([]);
    }
  };

  // Don't render if user doesn't have access
  if (!canAccessProspects()) {
    return null;
  }

  return (
    <div className="deals-container">
      <div className="deals-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Prospects</h2>
        <button className="create-contact-btn" onClick={() => navigate('/admin-dashboard/prospects/create')}>
          Create Prospects <span style={{ fontSize: '1.1em', marginLeft: 4 }}>▼</span>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #e0e4ea', minWidth: 240 }}
        />
      </div>
      <div className="contacts-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="contacts-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#f7f8fa' }}>
              <th style={{ width: 40 }}><input type="checkbox" disabled /></th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Industry</th>
              <th>Business Type</th>
              <th>Price Range</th>
              <th>Location</th>
              <th>City</th>
              <th>Contact Owner</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: '#888' }}>No contacts found.</td></tr>
            ) : (
              filteredContacts.map((c, idx) => (
                <tr key={c._id || idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td><input type="checkbox" /></td>
                  <td>{c.firstName}</td>
                  <td>{c.lastName}</td>
                  <td>{c.phone}</td>
                  <td>{c.email}</td>
                  <td>{c.industry || ''}</td>
                  <td>{c.businessType || ''}</td>
                  <td>{c.priceRange || ''}</td>
                  <td>{c.location || ''}</td>
                  <td>{c.city || ''}</td>
                  <td>{c.contactOwner || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Contacts; 