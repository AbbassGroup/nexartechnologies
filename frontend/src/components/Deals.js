import React, { useState, useEffect, useMemo } from 'react';
import '../styles/Deals.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

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

const Deals = () => {
  const query = useQuery();
  const [businessUnits, setBusinessUnits] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(() => {
    // Try to get the saved selection from localStorage
    const saved = localStorage.getItem('selectedBusinessUnit');
    return saved || '';
  });
  const [selectedOwner, setSelectedOwner] = useState(() => {
    // Try to get the saved owner selection from localStorage
    const saved = localStorage.getItem('selectedOwner');
    return saved || '';
  });
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, dealId: null, dealName: '' });
  const [editModal, setEditModal] = useState({ show: false, deal: null });
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  const SEARCHABLE_FIELDS = [
    'name', 'email', 'phone', 'stage', 'office', 'owner', 'notes', 'commission',
    'referralPartner', 'campaign', 'businessName', 'typeOfBusiness', 'sellingConsideration',
    'lengthOfOperation', 'location', 'member', 'leadStatus', 'accountName', 'type',
    'nextStep', 'leadSource', 'contactName', 'whereBased', 'whereToBuy', 'agreement',
    'agreementTerms', 'listingPrice', 'salesCommission', 'closingDate', 'probability',
    'expectedRevenue', 'campaignSource', 'whenToBuy', 'comments', 'abbassBusinessUnit',
    'abbassBusinessType', 'listingAgent', 'sellingAgent'
  ];

  // Fetch business units and offices on mount
  useEffect(() => {
    fetchBusinessUnits();
    fetchOffices();
    fetchUsers();
  }, []);

  const fetchBusinessUnits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/business-units`);
      const data = await response.json();
      setBusinessUnits(data.data || []);
      
      // Set default selected unit based on role only if no saved selection exists
      if (!selectedUnit && (data.data && data.data.length > 0)) {
        let defaultUnit = '';
        if (user.role === 'manager' && user.businessUnits && user.businessUnits.length > 0) {
          defaultUnit = user.businessUnits[0];
        } else {
          defaultUnit = data.data[0].name;
        }
        setSelectedUnit(defaultUnit);
        // Save the default selection to localStorage
        localStorage.setItem('selectedBusinessUnit', defaultUnit);
      }
    } catch (error) {
      setBusinessUnits([]);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offices`);
      const data = await response.json();
      setOffices(data.data || []);
    } catch (error) {
      setOffices([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/all-users`);
      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      setUsers([]);
    }
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      let url = '';
      if (user.role === 'manager') {
        // For managers, only fetch deals from their business unit
        url = `${API_BASE_URL}/api/deals?businessUnits=${user.businessUnits.join(',')}`;
      } else {
        // For super_admin and admin, fetch all deals
        url = `${API_BASE_URL}/api/deals`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-name': user.name,
          'x-user-role': user.role,
          'x-user-business-units': JSON.stringify(user.businessUnits || []),
          'x-user-office': user.office || ''
        }
      });
      const data = await response.json();
      let filteredDeals = Array.isArray(data.data) ? data.data : [];
      
      // Additional filtering for managers
      if (user.role === 'manager') {
        filteredDeals = filteredDeals.filter(deal =>
          user.businessUnits && user.businessUnits.includes(deal.businessUnit)
        );
      } else if (selectedUnit) {
        // For super_admin and admin, filter by selected unit if one is selected
        filteredDeals = filteredDeals.filter(deal => deal.businessUnit === selectedUnit);
      }
      
      // Filter by owner if selected
      if (selectedOwner) {
        filteredDeals = filteredDeals.filter(deal => deal.owner === selectedOwner);
      }
      
      // Update both deals and filteredDeals to ensure consistency
      setDeals(filteredDeals);
      setFilteredDeals(filteredDeals);
      
      // Clear any previous errors when deals are successfully loaded
      setError(null);
    } catch (error) {
      setError('Failed to load deals');
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [selectedUnit, selectedOwner, user.role]);

  // Add event listeners to refresh deals when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh deals when the window regains focus (user returns to the page)
      fetchDeals();
    };

    const handleVisibilityChange = () => {
      // Refresh deals when the page becomes visible again
      if (!document.hidden) {
        fetchDeals();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedUnit, selectedOwner, user.role]);

  useEffect(() => {
    if (!search) {
      // Maintain the sorted order from the backend by not re-sorting
      setFilteredDeals(deals);
    } else {
      const lower = search.toLowerCase();
      const filtered = deals.filter(deal =>
        SEARCHABLE_FIELDS.some(
          field =>
            deal[field] &&
            deal[field].toString().toLowerCase().includes(lower)
        )
      );
      // Sort the filtered results by lastModifiedAt to maintain order
      const sorted = filtered.sort((a, b) => {
        const aTime = a.lastModifiedAt ? new Date(a.lastModifiedAt) : new Date(a.createdAt || a.dateCreated);
        const bTime = b.lastModifiedAt ? new Date(b.lastModifiedAt) : new Date(b.createdAt || b.dateCreated);
        return bTime - aTime; // Newest first
      });
      setFilteredDeals(sorted);
    }
  }, [search, deals]);

  // Group deals by stage (already sorted by lastModifiedAt from backend and search filtering)
  const dealsByStage = useMemo(() => {
    return (user.role === 'manager' 
      ? PIPELINES[user.businessUnits[0]] 
      : PIPELINES[selectedUnit])?.reduce((acc, stage) => {
        const stageDeals = filteredDeals.filter(deal => deal.stage === stage);
        // Deals are already sorted by lastModifiedAt from backend and search filtering
        acc[stage] = stageDeals;
        return acc;
      }, {}) || {};
  }, [filteredDeals, user.role, user.businessUnits, selectedUnit]);

  // Check if user can edit a specific deal
  const canEditDeal = (deal) => {
    if (!user) return false;
    
    // Super admin and admin can edit any deal
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }
    
    // Managers can only edit deals from their office
    if (user.role === 'manager') {
      return deal.office === user.office;
    }
    
    return false;
  };

  // Handle drag end and update backend
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    console.log('Drag end result:', { source, destination, draggableId });
    
    // Check if the user has permission to move this deal
    const deal = deals.find(d => d._id === draggableId);
    if (!deal) {
      console.error('Deal not found for ID:', draggableId);
      return;
    }

    console.log('Found deal:', deal);

    // Role-based validation for drag and drop
    if (user.role === 'manager') {
      // Managers can only drag deals from their office
      if (deal.office !== user.office) {
        setError('You can only move deals from your office location');
        return;
      }
    }

    // Don't update if moving to the same stage
    if (source.droppableId === destination.droppableId) {
      console.log('Same stage, no update needed');
      return;
    }

    // Optimistic update - update UI immediately
    setDeals(prevDeals => 
      prevDeals.map(d => 
        d._id === draggableId 
          ? { ...d, stage: destination.droppableId }
          : d
      )
    );
    
    // Also update filteredDeals to maintain consistency
    setFilteredDeals(prevFiltered => 
      prevFiltered.map(d => 
        d._id === draggableId 
          ? { ...d, stage: destination.droppableId }
          : d
      )
    );

    try {
      console.log('Sending update to backend for deal:', draggableId, 'to stage:', destination.droppableId);
      
      const response = await fetch(`${API_BASE_URL}/api/deals/${draggableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-name': user.name,
          'x-user-role': user.role,
          'x-user-business-units': JSON.stringify(user.businessUnits || []),
          'x-user-office': user.office || ''
        },
        body: JSON.stringify({
          stage: destination.droppableId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update deal stage');
      }

      const result = await response.json();
      console.log('Backend update successful:', result);
      
      // Update local state with the server response data to ensure consistency
      if (result.success && result.data) {
        setDeals(prevDeals => 
          prevDeals.map(d => 
            d._id === draggableId 
              ? { ...d, ...result.data }
              : d
          )
        );
        
        setFilteredDeals(prevFiltered => 
          prevFiltered.map(d => 
            d._id === draggableId 
              ? { ...d, ...result.data }
              : d
          )
        );
      }
      
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error updating deal:', error);
      setError('Failed to update deal stage');
      
      // Revert the optimistic update on error
      setDeals(prevDeals => 
        prevDeals.map(d => 
          d._id === draggableId 
            ? { ...d, stage: source.droppableId }
            : d
        )
      );
      
      // Also revert filteredDeals
      setFilteredDeals(prevFiltered => 
        prevFiltered.map(d => 
          d._id === draggableId 
            ? { ...d, stage: source.droppableId }
            : d
        )
      );
    }
  };

  // Handle deal deletion (super admin only)
  const handleDeleteDeal = async (dealId) => {
    if (user.role !== 'super_admin') return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-name': user.name,
          'x-user-role': user.role,
          'x-user-business-units': JSON.stringify(user.businessUnits || []),
          'x-user-office': user.office || ''
        }
      });

      if (!response.ok) throw new Error('Failed to delete deal');

      // Remove deal from local state
      setDeals(prevDeals => prevDeals.filter(deal => deal._id !== dealId));
      setDeleteConfirm({ show: false, dealId: null, dealName: '' });
      setError(null);
    } catch (error) {
      setError('Failed to delete deal');
      console.error('Error deleting deal:', error);
    }
  };

  // Show delete confirmation dialog
  const showDeleteConfirm = (dealId, dealName) => {
    setDeleteConfirm({ show: true, dealId, dealName });
  };

  // Cancel delete confirmation
  const cancelDelete = () => {
    setDeleteConfirm({ show: false, dealId: null, dealName: '' });
  };

  // Show edit modal
  const showEditModal = (deal) => {
    // Check if user can edit this deal
    if (!canEditDeal(deal)) {
      setError('You can only edit deals from your office location');
      return;
    }

    setEditForm({
      name: deal.name || '',
      email: deal.email || '',
      phone: deal.phone || '',
      stage: deal.stage || '',
      office: deal.office || '',
      owner: deal.owner || '',
      notes: deal.notes || '',
      commission: deal.commission || '',
      referralPartner: deal.referralPartner || '',
      campaign: deal.campaign || '',
      businessName: deal.businessName || '',
      typeOfBusiness: deal.typeOfBusiness || '',
      sellingConsideration: deal.sellingConsideration || '',
      lengthOfOperation: deal.lengthOfOperation || '',
      location: deal.location || '',
      member: deal.member || 'No',
      dateCreated: deal.dateCreated || new Date().toISOString().split('T')[0],
      abbassBusinessUnit: deal.abbassBusinessUnit || '',
      abbassBusinessType: deal.abbassBusinessType || '',
      listingAgent: deal.listingAgent || '',
      sellingAgent: deal.sellingAgent || ''
    });
    setEditModal({ show: true, deal });
    setEditError('');
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ show: false, deal: null });
    setEditForm({});
    setEditError('');
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    try {
      if (!editForm.name.trim()) {
        throw new Error('Deal name is required');
      }

      // Additional validation for managers
      if (user.role === 'manager') {
        if (editForm.office !== user.office) {
          throw new Error('You can only edit deals from your office location');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/deals/${editModal.deal._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-name': user.name,
          'x-user-role': user.role,
          'x-user-business-units': JSON.stringify(user.businessUnits || []),
          'x-user-office': user.office || ''
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update deal');
      }

      const updatedDeal = await response.json();
      
      // Update local state with the actual server response data
      if (updatedDeal.success && updatedDeal.data) {
        const updatedDealData = updatedDeal.data;
        setDeals(prevDeals => 
          prevDeals.map(deal => 
            deal._id === editModal.deal._id ? updatedDealData : deal
          )
        );
        
        // Also update filteredDeals to maintain consistency
        setFilteredDeals(prevFiltered => 
          prevFiltered.map(deal => 
            deal._id === editModal.deal._id ? updatedDealData : deal
          )
        );
      } else {
        // Fallback to form data if server response doesn't include the full deal
        const updatedDealData = { ...editModal.deal, ...editForm };
        setDeals(prevDeals => 
          prevDeals.map(deal => 
            deal._id === editModal.deal._id ? updatedDealData : deal
          )
        );
        
        // Also update filteredDeals
        setFilteredDeals(prevFiltered => 
          prevFiltered.map(deal => 
            deal._id === editModal.deal._id ? updatedDealData : deal
          )
        );
      }

      closeEditModal();
      setError(null);
    } catch (error) {
      setEditError(error.message);
      console.error('Error updating deal:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleBusinessUnitChange = (e) => {
    const newValue = e.target.value;
    setSelectedUnit(newValue);
    // Save the selection to localStorage
    localStorage.setItem('selectedBusinessUnit', newValue);
  };

  const handleOwnerChange = (e) => {
    const newValue = e.target.value;
    setSelectedOwner(newValue);
    // Save the selection to localStorage
    localStorage.setItem('selectedOwner', newValue);
  };

  // Helper to get Business Brokers users for agent dropdowns
  const getBusinessBrokerUsers = () => {
    return users.filter(userItem => {
      if (userItem.role === 'super_admin' || userItem.role === 'admin') return true;
      if (userItem.role === 'manager' && userItem.businessUnit === 'Business Brokers') return true;
      return false;
    });
  };

  // Helper to get unique owners from deals
  const getUniqueOwners = () => {
    const owners = new Set();
    deals.forEach(deal => {
      if (deal.owner) {
        owners.add(deal.owner);
      }
    });
    return Array.from(owners).sort();
  };

  // Handle export functionality
  const handleExport = async () => {
    setExporting(true);
    try {
      // Prepare the data for export
      const exportData = deals.map(deal => ({
        'Deal Name': deal.name || '',
        'Stage': deal.stage || '',
        'Business Unit': deal.businessUnit || '',
        'Office': deal.office || '',
        'Owner': deal.owner || '',
        'Email': deal.email || '',
        'Phone': deal.phone || '',
        'Date Created': deal.dateCreated ? new Date(deal.dateCreated).toLocaleDateString() : '',
        'Notes': deal.notes || '',
        'Commission': deal.commission || '',
        'Referral Partner': deal.referralPartner || '',
        'Campaign': deal.campaign || '',
        'Business Name': deal.businessName || '',
        'Type of Business': deal.typeOfBusiness || '',
        'Selling Consideration': deal.sellingConsideration || '',
        'Length of Operation': deal.lengthOfOperation || '',
        'Location': deal.location || '',
        'Listing Agent': deal.listingAgent || '',
        'Selling Agent': deal.sellingAgent || '',
        'Member': deal.member || '',
        'Lead Status': deal.leadStatus || '',
        'Account Name': deal.accountName || '',
        'Type': deal.type || '',
        'Next Step': deal.nextStep || '',
        'Lead Source': deal.leadSource || '',
        'Contact Name': deal.contactName || '',
        'Where Based': deal.whereBased || '',
        'Where To Buy': deal.whereToBuy || '',
        'Agreement': deal.agreement || '',
        'Agreement Terms': deal.agreementTerms || '',
        'Listing Price': deal.listingPrice || '',
        'Sales Commission': deal.salesCommission || '',
        'Closing Date': deal.closingDate || '',
        'Probability': deal.probability || '',
        'Expected Revenue': deal.expectedRevenue || '',
        'Campaign Source': deal.campaignSource || '',
        'When To Buy': deal.whenToBuy || '',
        'Comments': deal.comments || '',
        'ABBASS Business Unit': deal.abbassBusinessUnit || '',
        'ABBASS Business Type': deal.abbassBusinessType || ''
      }));

      // Create workbook and worksheet
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 20 }, // Deal Name
        { wch: 15 }, // Stage
        { wch: 15 }, // Business Unit
        { wch: 15 }, // Office
        { wch: 15 }, // Owner
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Date Created
        { wch: 30 }, // Notes
        { wch: 15 }, // Commission
        { wch: 20 }, // Referral Partner
        { wch: 15 }, // Campaign
        { wch: 20 }, // Business Name
        { wch: 20 }, // Type of Business
        { wch: 20 }, // Selling Consideration
        { wch: 20 }, // Length of Operation
        { wch: 15 }, // Location
        { wch: 15 }, // Listing Agent
        { wch: 15 }, // Selling Agent
        { wch: 10 }, // Member
        { wch: 15 }, // Lead Status
        { wch: 15 }, // Account Name
        { wch: 15 }, // Type
        { wch: 15 }, // Next Step
        { wch: 15 }, // Lead Source
        { wch: 15 }, // Contact Name
        { wch: 15 }, // Where Based
        { wch: 15 }, // Where To Buy
        { wch: 15 }, // Agreement
        { wch: 20 }, // Agreement Terms
        { wch: 15 }, // Listing Price
        { wch: 15 }, // Sales Commission
        { wch: 15 }, // Closing Date
        { wch: 10 }, // Probability
        { wch: 15 }, // Expected Revenue
        { wch: 15 }, // Campaign Source
        { wch: 15 }, // When To Buy
        { wch: 30 }, // Comments
        { wch: 20 }, // ABBASS Business Unit
        { wch: 20 }  // ABBASS Business Type
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Deals');

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Create download link
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deals_${selectedUnit || 'all'}_${selectedOwner || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting deals');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="deals-loading">Loading deals...</div>;
  }

  return (
    <div className="deals-container">
      <div className="deals-header">
        <h2>Deals Management</h2>
        <div className="deals-filters">
          <select 
            value={selectedUnit} 
            onChange={handleBusinessUnitChange}
            className="filter-select"
            disabled={user.role === 'manager'}
          >
            {user.role === 'manager'
              ? businessUnits.filter(unit => user.businessUnits.includes(unit.name)).map(unit => (
                  <option key={unit._id} value={unit.name}>{unit.name}</option>
                ))
              : businessUnits.map(unit => (
                  <option key={unit._id} value={unit.name}>{unit.name}</option>
                ))
            }
          </select>
          <select 
            value={selectedOwner} 
            onChange={handleOwnerChange}
            className="filter-select"
          >
            <option value="">All Owners</option>
            {getUniqueOwners().map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
          <button 
            className="export-btn"
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
              marginRight: '10px'
            }}
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button 
            className="create-deal-btn"
            onClick={() => navigate('/deals/create')}
          >
            Create Deal
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #e0e4ea', minWidth: 240 }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete the deal "{deleteConfirm.dealName}"?</p>
            <p>This action cannot be undone.</p>
            <div className="delete-modal-buttons">
              <button 
                className="delete-confirm-btn"
                onClick={() => handleDeleteDeal(deleteConfirm.dealId)}
              >
                Delete
              </button>
              <button 
                className="delete-cancel-btn"
                onClick={cancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deal Modal */}
      {editModal.show && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit Deal</h3>
              <button className="close-modal-btn" onClick={closeEditModal}>×</button>
            </div>
            
            {editError && <div className="error-message">{editError}</div>}
            
            <form onSubmit={handleEditSubmit} className="edit-form">
              <div className="edit-form-section">
                <h4>Basic Information</h4>
                
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>Deal Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={editForm.name} 
                      onChange={handleEditChange} 
                      required 
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Stage</label>
                    <select name="stage" value={editForm.stage} onChange={handleEditChange}>
                      {PIPELINES[editModal.deal.businessUnit]?.map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* ABBASS Group Specific Fields */}
                {editModal.deal.businessUnit === 'ABBASS Group' && (
                  <>
                    <div className="edit-form-row">
                      <div className="edit-form-group">
                        <label>Business Unit</label>
                        <input
                          type="text"
                          name="abbassBusinessUnit"
                          value={editForm.abbassBusinessUnit || ''}
                          onChange={handleEditChange}
                          placeholder="Enter ABBASS Group Business Unit"
                        />
                      </div>
                      <div className="edit-form-group">
                        <label>Business Type</label>
                        <input
                          type="text"
                          name="abbassBusinessType"
                          value={editForm.abbassBusinessType || ''}
                          onChange={handleEditChange}
                          placeholder="Enter ABBASS Group Business Type"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>Office</label>
                    <select name="office" value={editForm.office} onChange={handleEditChange}>
                      {offices.map(office => (
                        <option key={office._id} value={office.name}>{office.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Owner</label>
                    <input type="text" name="owner" value={editForm.owner} onChange={handleEditChange} />
                  </div>
                </div>
                
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={editForm.email} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Phone</label>
                    <input type="text" name="phone" value={editForm.phone} onChange={handleEditChange} />
                  </div>
                </div>
                
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>Commission</label>
                    <input type="text" name="commission" value={editForm.commission} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Date Created</label>
                    <input type="date" name="dateCreated" value={editForm.dateCreated} onChange={handleEditChange} />
                  </div>
                </div>
                
                <div className="edit-form-group full-width">
                  <label>Notes</label>
                  <textarea name="notes" value={editForm.notes} onChange={handleEditChange} rows="3" />
                </div>
              </div>
              
              {/* Business Brokers Specific Fields */}
              {editModal.deal.businessUnit === 'Business Brokers' && (
                <div className="edit-form-section">
                  <h4>Business Information</h4>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Business Name</label>
                      <input type="text" name="businessName" value={editForm.businessName} onChange={handleEditChange} />
                    </div>
                    <div className="edit-form-group">
                      <label>Type of Business</label>
                      <input type="text" name="typeOfBusiness" value={editForm.typeOfBusiness} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Listing Agent</label>
                      <select name="listingAgent" value={editForm.listingAgent} onChange={handleEditChange} required>
                        <option value="">Select Listing Agent</option>
                        {getBusinessBrokerUsers().map(userItem => (
                          <option key={userItem._id} value={userItem.name || (userItem.firstName + ' ' + userItem.lastName).trim()}>
                            {userItem.name || (userItem.firstName + ' ' + userItem.lastName).trim()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="edit-form-group">
                      <label>Selling Agent</label>
                      <select name="sellingAgent" value={editForm.sellingAgent} onChange={handleEditChange} required>
                        <option value="">Select Selling Agent</option>
                        {getBusinessBrokerUsers().map(userItem => (
                          <option key={userItem._id} value={userItem.name || (userItem.firstName + ' ' + userItem.lastName).trim()}>
                            {userItem.name || (userItem.firstName + ' ' + userItem.lastName).trim()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Selling Consideration</label>
                      <input type="text" name="sellingConsideration" value={editForm.sellingConsideration} onChange={handleEditChange} />
                    </div>
                    <div className="edit-form-group">
                      <label>Length of Operation</label>
                      <input type="text" name="lengthOfOperation" value={editForm.lengthOfOperation} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="edit-form-group full-width">
                    <label>Location</label>
                    <input type="text" name="location" value={editForm.location} onChange={handleEditChange} />
                  </div>
                </div>
              )}
              
              {/* Global Properties Specific Fields */}
              {editModal.deal.businessUnit === 'Global Properties' && (
                <div className="edit-form-section">
                  <h4>Member Information</h4>
                  
                  <div className="edit-form-group">
                    <label>Member</label>
                    <select name="member" value={editForm.member} onChange={handleEditChange}>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>Referral Partner</label>
                    <input type="text" name="referralPartner" value={editForm.referralPartner} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Campaign</label>
                    <input type="text" name="campaign" value={editForm.campaign} onChange={handleEditChange} />
                  </div>
                </div>
              
              <div className="edit-form-actions">
                <button type="button" className="cancel-btn" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={editLoading}>
                  {editLoading ? 'Updating...' : 'Update Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          <div className="kanban-row">
            {(user.role === 'manager' 
              ? PIPELINES[user.businessUnits[0]] 
              : PIPELINES[selectedUnit])?.map(stage => (
              <div key={stage} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="kanban-stage-title">{stage}</span>
                  <span className="deal-count">({dealsByStage[stage]?.length || 0})</span>
                </div>
                <Droppable droppableId={stage}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="kanban-cards"
                    >
                      {dealsByStage[stage]?.map((deal, index) => (
                        <Draggable
                          key={`${deal._id}-${deal.stage}-${index}`}
                          draggableId={deal._id}
                          index={index}
                          isDragDisabled={user.role === 'manager' && deal.office !== user.office}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`deal-card ${user.role === 'manager' && deal.office !== user.office ? 'non-draggable' : 'draggable'}`}
                            >
                              <div className="deal-card-header">
                                <h4>{deal.name}</h4>
                                <div className="deal-card-actions">
                                  {canEditDeal(deal) && (
                                    <button
                                      className="edit-deal-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showEditModal(deal);
                                      }}
                                      title="Edit deal"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                  {user.role === 'super_admin' && (
                                    <button
                                      className="delete-deal-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showDeleteConfirm(deal._id, deal.name);
                                      }}
                                      title="Delete deal"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                                                             <div className="deal-details">
                                 <span className="deal-owner">{deal.owner}</span>
                                 {deal.businessName && (
                                   <span className="deal-business-name">Business: {deal.businessName}</span>
                                 )}
                               </div>
                               
                               {/* Last Modified Information */}
                               {deal.lastModifiedBy && (
                                 <div className="deal-last-modified">
                                   <span className="last-modified-label">Last modified by:</span>
                                   <span className="last-modified-value">{deal.lastModifiedBy}</span>
                                   {deal.lastModifiedAt && (
                                     <span className="last-modified-time">
                                       {new Date(deal.lastModifiedAt).toLocaleDateString()}
                                     </span>
                                   )}
                                 </div>
                               )}
                             </div>
                           )}
                         </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default Deals;