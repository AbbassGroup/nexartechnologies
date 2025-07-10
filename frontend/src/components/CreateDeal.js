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
  'Business Broker': [
    'Enquiry', 'Initial Consultation', 'Proposal sent', 'Backlog for FLUP', 'Engagement Signed', 'Ad launch', 'Under offer', 'Settled, Invoice paid',
    'Nurture', 'DNQ', 'Closed Lost', 'CLOSED. Do Not Contact'
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
    leadStatus: DUMMY_LEAD_STATUS[0],
    name: '',
    accountName: '',
    email: '',
    phone: '',
    type: DUMMY_TYPES[0],
    nextStep: '',
    leadSource: DUMMY_LEAD_SOURCE[0],
    contactName: '',
    whereBased: '',
    whereToBuy: '',
    listingAgent: DUMMY_AGENTS[0],
    sellingAgent: DUMMY_AGENTS[0],
    agreement: DUMMY_AGREEMENTS[0],
    businessName: '',
    typeOfBusiness: '',
    sellingConsideration: '',
    agreementTerms: '',
    listingPrice: '',
    salesCommission: '',
    closingDate: '',
    businessUnit: query.get('businessUnit') || '',
    stage: '',
    probability: 0,
    expectedRevenue: '',
    campaignSource: '',
    whenToBuy: '',
    comments: '',
    lengthOfOperation: '',
    location: '',
    office: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [businessUnits, setBusinessUnits] = useState([]);
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    fetchBusinessUnits();
    fetchOffices();
  }, []);

  const fetchBusinessUnits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/business-units`);
      const data = await response.json();
      setBusinessUnits(data.data || []);
      // Set default business unit in form if not already set
      if (data.data && data.data.length > 0 && !form.businessUnit) {
        const defaultUnit = data.data[0].name;
        setForm(prev => ({ 
          ...prev, 
          businessUnit: defaultUnit,
          stage: PIPELINES[defaultUnit]?.[0] || ''
        }));
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
      // Set default office in form if not already set
      if (data.data && data.data.length > 0 && !form.office) {
        setForm(prev => ({ ...prev, office: data.data[0].name }));
      }
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
        stage: user?.role === 'manager' 
          ? PIPELINES[user.businessUnits?.[0]]?.[0] || ''
          : PIPELINES[value]?.[0] || '' 
      } : {})
    }));
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
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const payload = {
        ...form,
        owner: user.name,
        // Convert numeric fields
        probability: Number(form.probability) || 0,
        // Ensure required fields are not empty strings
        name: form.name.trim(),
        businessUnit: form.businessUnit || businessUnits[0]?.name || '',
        stage: form.stage || '',
        office: form.office || offices[0]?.name || ''
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
        
        <form className="deal-form deal-form-grid" onSubmit={handleSubmit}>
          {/* Left Column */}
          <div className="deal-form-col">
            <div className="form-group-row">
              <label>Lead Status</label>
              <select name="leadStatus" value={form.leadStatus} onChange={handleChange}>
                {DUMMY_LEAD_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
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
              <label>Account Name</label>
              <div className="input-icon-wrapper">
                <input name="accountName" value={form.accountName} onChange={handleChange} />
                <span className="input-icon">🏢</span>
              </div>
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
              <label>Type</label>
              <select name="type" value={form.type} onChange={handleChange}>
                {DUMMY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Next Step</label>
              <input type="text" name="nextStep" value={form.nextStep} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Lead Source</label>
              <select name="leadSource" value={form.leadSource} onChange={handleChange}>
                {DUMMY_LEAD_SOURCE.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Contact Name</label>
              <input type="text" name="contactName" value={form.contactName} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Where are you based?</label>
              <input type="text" name="whereBased" value={form.whereBased} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Where would you like to buy?</label>
              <input type="text" name="whereToBuy" value={form.whereToBuy} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Listing Agent</label>
              <select name="listingAgent" value={form.listingAgent} onChange={handleChange}>
                {DUMMY_AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Selling Agent</label>
              <select name="sellingAgent" value={form.sellingAgent} onChange={handleChange}>
                {DUMMY_AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Agreement</label>
              <select name="agreement" value={form.agreement} onChange={handleChange}>
                {DUMMY_AGREEMENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Business Name</label>
              <input type="text" name="businessName" value={form.businessName} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Type of business</label>
              <input type="text" name="typeOfBusiness" value={form.typeOfBusiness} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Selling consideration</label>
              <input type="text" name="sellingConsideration" value={form.sellingConsideration} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Agreement Terms</label>
              <input type="text" name="agreementTerms" value={form.agreementTerms} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Listing price</label>
              <input type="text" name="listingPrice" value={form.listingPrice} onChange={handleChange} />
            </div>
          </div>
          {/* Right Column */}
          <div className="deal-form-col">
            <div className="form-group-row">
              <label>Sales Commission</label>
              <input type="text" name="salesCommission" value={form.salesCommission} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Closing Date</label>
              <input type="date" name="closingDate" value={form.closingDate} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Pipeline</label>
              <select 
                name="businessUnit" 
                value={form.businessUnit} 
                onChange={handleChange}
                disabled={user.role === 'manager'}
              >
                {businessUnits.length === 0 ? (
                  <option value="">Loading...</option>
                ) : user.role === 'manager'
                  ? businessUnits
                      .filter(unit => user.businessUnits?.includes(unit.name))
                      .map(unit => (
                        <option key={unit._id} value={unit.name}>{unit.name}</option>
                      ))
                  : businessUnits.map(unit => (
                      <option key={unit._id} value={unit.name}>{unit.name}</option>
                    ))
                }
              </select>
            </div>
            <div className="form-group-row">
              <label>Stage</label>
              <select 
                name="stage" 
                value={form.stage} 
                onChange={handleChange}
              >
                {(user.role === 'manager'
                  ? PIPELINES[user.businessUnits?.[0]]
                  : PIPELINES[form.businessUnit])?.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                )) || <option value="">Select business unit first</option>}
              </select>
            </div>
            <div className="form-group-row">
              <label>Probability (%)</label>
              <input 
                type="number" 
                name="probability" 
                value={form.probability} 
                onChange={handleChange} 
                min="0" 
                max="100" 
              />
            </div>
            <div className="form-group-row">
              <label>Expected Revenue</label>
              <input type="text" name="expectedRevenue" value={form.expectedRevenue} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Campaign Source</label>
              <input type="text" name="campaignSource" value={form.campaignSource} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>When would you like to buy?</label>
              <input type="text" name="whenToBuy" value={form.whenToBuy} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Comments</label>
              <textarea name="comments" value={form.comments} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Length of operation</label>
              <input type="text" name="lengthOfOperation" value={form.lengthOfOperation} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Location</label>
              <input type="text" name="location" value={form.location} onChange={handleChange} />
            </div>
            <div className="form-group-row">
              <label>Office Location</label>
              <select name="office" value={form.office} onChange={handleChange}>
                {offices.length === 0 ? (
                  <option value="">Loading...</option>
                ) : offices.map(office => (
                  <option key={office._id} value={office.name}>{office.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/deals')}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDeal;