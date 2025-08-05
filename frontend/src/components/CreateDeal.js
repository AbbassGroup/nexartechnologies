import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Deals.css';
import '../styles/CreateDeal.css';
import { useAuth } from '../context/AuthContext';

const DUMMY_USERS = ['Sadeq Abbass', 'John Doe', 'Jane Smith'];
const DUMMY_AGENTS = ['Agent A', 'Agent B', 'Agent C'];
const DUMMY_AGREEMENTS = ['Agreement 1', 'Agreement 2', 'Agreement 3'];
const DUMMY_TYPES = ['Type 1', 'Type 2', 'Type 3'];
const DUMMY_LEAD_STATUS = ['Not contacted', 'Contacted', 'Qualified', 'Lost'];
const DUMMY_LEAD_SOURCE = ['Source 1', 'Source 2', 'Source 3'];

const PIPELINES = {
  'Global Properties': [
    'Enquiry', 'Email Sent', 'Text Sent', 'Nurture', 'Initial Consultation',
    'Membership - Paid', 'Strategy Session', 'Property Presentation',
    'Expression of Interest', 'Closed Won', 'Membership - Refund Request',
    'DNQ', 'Membership - Refunded', 'Closed Lost'
  ],
  'Advocacy': [
    'Enquiry', 'Qualification', 'Initial Consultation', 'Strategy Session', 'Research & Analysis', 'Property Presentation',
    'Unconditional', 'Settled & invoice paid', 'Closed Won', 'Nurture', 'Closed Lost', 'DNQ', 'FLUP', 'CLOSED. Do Not Contact'
  ],
  'Finance': [
    'Enquiry', 'Qualification', 'Awaiting Documents', 'Assessing servicability', 'Serviceability provided to client', 'Loan application processing',
    'Pre-Approval', 'Contract signed', 'Unconditional loan', 'Settled', 'Nurture', 'DNQ', 'Closed Lost', 'FLUP', 'CLOSED. Do Not Contact'
  ],
  'Business Brokers': [
    'Enquiry', 'Initial Consultation', 'Proposal sent', 'Engagement Signed', 'Ad launch', 'Under offer', 'Settled, Invoice paid',
    'Nurture', 'DNQ', 'Closed Lost', 'CLOSED. Do Not Contact'
  ],
  'ABBASS Group': [
    'Enquiry', 'Initial Call', 'Interview 1', 'Interview 2', 'Offer', 'Contract Signed', 'Onboarded', 'Not Progressed'
  ]
};

const API_BASE_URL = process.env.REACT_APP_API_URL;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CreateDeal = () => {
  const query = useQuery();
  const { user } = useAuth();
  const [form, setForm] = useState({
    // Common fields for all business units
    businessUnit: query.get('businessUnit') || '',
    office: '',
    stage: '',
    name: '',
    email: '',
    phone: '',
    dateCreated: new Date().toISOString().split('T')[0],
    owner: '',
    notes: '',
    commission: '',
    referralPartner: '',
    campaign: '',
    
    // Business Brokers specific fields
    businessName: '',
    typeOfBusiness: '',
    sellingConsideration: '',
    lengthOfOperation: '',
    location: '',
    listingAgent: '',
    sellingAgent: '',
    
    // Global Properties specific fields
    member: 'No', // Default to 'No'
    
    // Legacy fields (keeping for backward compatibility)
    leadStatus: DUMMY_LEAD_STATUS[0],
    accountName: '',
    type: DUMMY_TYPES[0],
    nextStep: '',
    leadSource: DUMMY_LEAD_SOURCE[0],
    contactName: '',
    whereBased: '',
    whereToBuy: '',
    listingAgent: DUMMY_AGENTS[0],
    sellingAgent: DUMMY_AGENTS[0],
    agreement: DUMMY_AGREEMENTS[0],
    typeOfBusiness: '',
    agreementTerms: '',
    listingPrice: '',
    salesCommission: '',
    closingDate: '',
    probability: 0,
    expectedRevenue: '',
    campaignSource: '',
    whenToBuy: '',
    comments: '',
    lengthOfOperation: '',
    location: '',
    abbassBusinessUnit: '',
    abbassBusinessType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Select business unit, 2: Fill form
  const navigate = useNavigate();
  const [businessUnits, setBusinessUnits] = useState([]);
  const [offices, setOffices] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchBusinessUnits();
    fetchOffices();
    fetchUsers();
  }, []);

  // Update stage when business unit changes
  useEffect(() => {
    if (form.businessUnit && PIPELINES[form.businessUnit]) {
      setForm(prev => ({
        ...prev,
        stage: PIPELINES[form.businessUnit][0]
      }));
    }
  }, [form.businessUnit]);

  // Update owner when business unit changes or users are loaded
  useEffect(() => {
    if (form.businessUnit && users.length > 0) {
      const filteredUsers = getFilteredUsers();
      if (filteredUsers.length > 0) {
        // Set the first available user as default owner if no owner is selected
        const firstUserFullName = getUserFullName(filteredUsers[0]);
        if (!form.owner || !filteredUsers.find(u => getUserFullName(u) === form.owner)) {
          setForm(prev => ({
            ...prev,
            owner: firstUserFullName
          }));
        }
      }
    }
  }, [form.businessUnit, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/all-users`);
      const data = await response.json();
      setUsers(data.data || []);
      // Set current user as default owner
      if (user && !form.owner) {
        setForm(prev => ({ ...prev, owner: user.name }));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchBusinessUnits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/business-units`);
      const data = await response.json();
      setBusinessUnits(data.data || []);
      
      // Only set defaults if business unit is provided in URL
      if (query.get('businessUnit') && data.data && data.data.length > 0) {
        const urlBusinessUnit = query.get('businessUnit');
        const foundUnit = data.data.find(unit => unit.name === urlBusinessUnit);
        
        if (foundUnit) {
          setForm(prev => ({ 
            ...prev, 
            businessUnit: foundUnit.name,
            stage: PIPELINES[foundUnit.name]?.[0] || ''
          }));
          setStep(2); // Move to form step if business unit is provided
        }
      } else {
        // Always start with step 1 if no business unit is provided
        setStep(1);
      }
    } catch (error) {
      console.error('Error fetching business units:', error);
      setBusinessUnits([]);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offices`);
      const data = await response.json();
      setOffices(data.data || []);
    } catch (error) {
      console.error('Error fetching offices:', error);
      setOffices([]);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'businessUnit' ? { 
        stage: PIPELINES[value]?.[0] || '' 
      } : {})
    }));
  };

  const handleBusinessUnitSelect = (selectedBusinessUnit) => {
    setForm(prev => ({
      ...prev,
      businessUnit: selectedBusinessUnit,
      stage: PIPELINES[selectedBusinessUnit]?.[0] || '',
      office: offices[0]?.name || '',
      owner: user?.name || ''
    }));
    setStep(2);
  };

  // Filter users based on selected business unit
  const getFilteredUsers = () => {
    if (!form.businessUnit || !users.length) return [];
    
    return users.filter(userItem => {
      // Super admin and admin can always be owners
      if (userItem.role === 'super_admin' || userItem.role === 'admin') {
        return true;
      }
      
      // For managers, check if they belong to the selected business unit
      if (userItem.role === 'manager') {
        // Check if the manager's business unit matches the selected business unit
        return userItem.businessUnit === form.businessUnit;
      }
      
      return false;
    });
  };

  // Helper function to get user's full name
  const getUserFullName = (userItem) => {
    if (userItem.name) {
      return userItem.name; // If name field exists, use it
    }
    // Otherwise construct from firstName and lastName
    return `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim();
  };

  // Helper to get Business Brokers users for agent dropdowns
  const getBusinessBrokerUsers = () => {
    return users.filter(userItem => {
      if (userItem.role === 'super_admin' || userItem.role === 'admin') return true;
      if (userItem.role === 'manager' && userItem.businessUnit === 'Business Brokers') return true;
      return false;
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validate required fields
      if (!form.name.trim()) {
        throw new Error('Deal name is required');
      }
      
      if (!form.businessUnit) {
        throw new Error('Business unit is required');
      }
      
      // Validate Business Brokers specific required fields
      if (form.businessUnit === 'Business Brokers') {
        if (!form.businessName.trim()) {
          throw new Error('Business name is required for Business Brokers deals');
        }
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const payload = {
        ...form,
        // Convert numeric fields
        probability: Number(form.probability) || 0,
        // Ensure required fields are not empty strings and set defaults
        name: form.name.trim(),
        businessUnit: form.businessUnit,
        stage: form.stage || PIPELINES[form.businessUnit]?.[0] || '',
        office: form.office || offices[0]?.name || '',
        owner: form.owner || user.name,
        dateCreated: form.dateCreated || new Date().toISOString().split('T')[0],
        referralPartner: form.referralPartner,
        campaign: form.campaign,
        listingAgent: form.listingAgent,
        sellingAgent: form.sellingAgent,
        ...(form.businessUnit === 'ABBASS Group' ? {
          abbassBusinessUnit: form.abbassBusinessUnit || '',
          abbassBusinessType: form.abbassBusinessType || ''
        } : {})
      };

      console.log('Submitting payload:', payload); // Debug log

      const response = await fetch(`${API_BASE_URL}/api/deals`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add authorization header if available
          ...(user.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Deal created successfully:', result);
      navigate('/admin-dashboard/deals');
    } catch (error) {
      console.error('Error creating deal:', error);
      setError(error.message || 'Failed to create deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="create-deal-bg">
        <div className="deals-container">
          <div className="deals-header">
            <h2 className="create-deal-title">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-deal-bg">
      <div className="deals-container">
        <div className="deals-header">
          <h2 className="create-deal-title">Create New Deal</h2>
        </div>
        
        {error && (
          <div className="error-message" style={{ 
            color: 'red', 
            padding: '10px', 
            marginBottom: '20px', 
            border: '1px solid red', 
            borderRadius: '4px',
            backgroundColor: '#ffebee'
          }}>
            {error}
          </div>
        )}
        
        {step === 1 ? (
          // Step 1: Select Business Unit
          <div className="business-unit-selection">
            <div className="business-unit-header">
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => navigate('/admin-dashboard/deals')}
              >
                ← Back to Deals
              </button>
              <h3>Select Business Unit</h3>
            </div>
            <p>Please select a business unit to create a deal for:</p>
            
            <div className="business-unit-grid">
              {businessUnits.length === 0 ? (
                <div className="loading">Loading business units...</div>
              ) : (user.role === 'manager' || user.role === 'user')
                ? businessUnits
                    .filter(unit => user.businessUnits?.includes(unit.name))
                    .map(unit => (
                      <div 
                        key={unit._id} 
                        className="business-unit-card"
                        onClick={() => handleBusinessUnitSelect(unit.name)}
                      >
                        <h4>{unit.name}</h4>
                        <p>Click to create a deal for this business unit</p>
                      </div>
                    ))
                : businessUnits.map(unit => (
                    <div 
                      key={unit._id} 
                      className="business-unit-card"
                      onClick={() => handleBusinessUnitSelect(unit.name)}
                    >
                      <h4>{unit.name}</h4>
                      <p>Click to create a deal for this business unit</p>
                    </div>
                  ))
              }
            </div>
          </div>
        ) : (
          // Step 2: Fill Form
          <form className="deal-form deal-form-grid" onSubmit={handleSubmit}>
            {/* Common Fields */}
            <div className="form-section">
              <h3>Common Information</h3>
              
              <div className="form-group-row">
                <label>Business Unit</label>
                <input 
                  type="text" 
                  value={form.businessUnit} 
                  disabled 
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>
              
              <div className="form-group-row">
                <label>Office *</label>
                <select name="office" value={form.office} onChange={handleChange} required>
                  <option value="">Select Office</option>
                  {offices.map(office => (
                    <option key={office._id} value={office.name}>{office.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group-row">
                <label>Stage *</label>
                <select name="stage" value={form.stage} onChange={handleChange} required>
                  {PIPELINES[form.businessUnit]?.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  )) || <option value="">Select business unit first</option>}
                </select>
              </div>
              {/* ABBASS Group Specific Fields */}
              {form.businessUnit === 'ABBASS Group' && (
                <>
                  <div className="form-group-row">
                    <label>Business Unit</label>
                    <input
                      type="text"
                      name="abbassBusinessUnit"
                      value={form.abbassBusinessUnit || ''}
                      onChange={handleChange}
                      placeholder="Enter ABBASS Group Business Unit"
                    />
                  </div>
                  <div className="form-group-row">
                    <label>Business Type</label>
                    <input
                      type="text"
                      name="abbassBusinessType"
                      value={form.abbassBusinessType || ''}
                      onChange={handleChange}
                      placeholder="Enter ABBASS Group Business Type"
                    />
                  </div>
                </>
              )}
              
              <div className="form-group-row">
                <label>Deal Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Enter deal name"
                />
              </div>
              
              <div className="form-group-row">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} />
              </div>
              
              <div className="form-group-row">
                <label>Phone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              
              <div className="form-group-row">
                <label>Date Created</label>
                <input type="date" name="dateCreated" value={form.dateCreated} onChange={handleChange} />
              </div>
              
              <div className="form-group-row">
                <label>Owner</label>
                <select name="owner" value={form.owner} onChange={handleChange}>
                  <option value="">Select Owner</option>
                  {getFilteredUsers().map(userItem => {
                    const fullName = getUserFullName(userItem);
                    return (
                      <option key={userItem._id} value={fullName}>
                        {fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="form-group-row">
                <label>Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} />
              </div>
              
              <div className="form-group-row">
                <label>Commission</label>
                <input type="text" name="commission" value={form.commission} onChange={handleChange} />
              </div>
              <div className="form-group-row">
                <label>Referral Partner</label>
                <input type="text" name="referralPartner" value={form.referralPartner} onChange={handleChange} placeholder="Enter referral partner" />
              </div>
              <div className="form-group-row">
                <label>Campaign</label>
                <input type="text" name="campaign" value={form.campaign} onChange={handleChange} placeholder="Enter campaign" />
              </div>
            </div>
            
            {/* Business Brokers Specific Fields */}
            {form.businessUnit === 'Business Brokers' && (
              <div className="form-section">
                <h3>Business Information</h3>
                <div className="form-group-row">
                  <label>Business Name *</label>
                  <input 
                    type="text" 
                    name="businessName" 
                    value={form.businessName} 
                    onChange={handleChange} 
                    required 
                    placeholder="Enter business name"
                  />
                </div>
                <div className="form-group-row">
                  <label>Listing Agent</label>
                  <select name="listingAgent" value={form.listingAgent} onChange={handleChange}>
                    <option value="">Select Listing Agent</option>
                    {getBusinessBrokerUsers().map(userItem => (
                      <option key={userItem._id} value={getUserFullName(userItem)}>
                        {getUserFullName(userItem)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group-row">
                  <label>Selling Agent</label>
                  <select name="sellingAgent" value={form.sellingAgent} onChange={handleChange}>
                    <option value="">Select Selling Agent</option>
                    {getBusinessBrokerUsers().map(userItem => (
                      <option key={userItem._id} value={getUserFullName(userItem)}>
                        {getUserFullName(userItem)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group-row">
                  <label>Type of Business</label>
                  <input type="text" name="typeOfBusiness" value={form.typeOfBusiness} onChange={handleChange} />
                </div>
                <div className="form-group-row">
                  <label>Selling Consideration</label>
                  <input type="text" name="sellingConsideration" value={form.sellingConsideration} onChange={handleChange} />
                </div>
                <div className="form-group-row">
                  <label>Length of Operation</label>
                  <input type="text" name="lengthOfOperation" value={form.lengthOfOperation} onChange={handleChange} />
                </div>
                <div className="form-group-row">
                  <label>Location</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange} />
                </div>
              </div>
            )}
            
            {/* Global Properties Specific Fields */}
            {form.businessUnit === 'Global Properties' && (
              <div className="form-section">
                <h3>Member Information</h3>
                
                <div className="form-group-row">
                  <label>Member</label>
                  <select name="member" value={form.member} onChange={handleChange}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>
            )}
            
            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="cancel-btn" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/deals')}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateDeal;