import React, { useState, useEffect } from 'react';
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
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, dealId: null, dealName: '' });
  const [editModal, setEditModal] = useState({ show: false, deal: null });
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch business units and offices on mount
  useEffect(() => {
    fetchBusinessUnits();
    fetchOffices();
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
      
      const response = await fetch(url);
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
      
      setDeals(filteredDeals);
    } catch (error) {
      setError('Failed to load deals');
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [selectedUnit, user.role]);

  // Group deals by stage
  const dealsByStage = (user.role === 'manager' 
    ? PIPELINES[user.businessUnits[0]] 
    : PIPELINES[selectedUnit])?.reduce((acc, stage) => {
      acc[stage] = deals.filter(deal => deal.stage === stage);
      return acc;
    }, {}) || {};

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

    try {
      console.log('Sending update to backend for deal:', draggableId, 'to stage:', destination.droppableId);
      
      const response = await fetch(`${API_BASE_URL}/api/deals/${draggableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: destination.droppableId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update deal stage');
      }

      console.log('Backend update successful');
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
        },
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
      abbassBusinessType: deal.abbassBusinessType || ''
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
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update deal');
      }

      const updatedDeal = await response.json();
      
      // Update local state
      setDeals(prevDeals => 
        prevDeals.map(deal => 
          deal._id === editModal.deal._id ? { ...deal, ...editForm } : deal
        )
      );

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
          <button 
            className="create-deal-btn"
            onClick={() => navigate('/deals/create')}
          >
            Create Deal
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

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
                                <span className="deal-office">{deal.office}</span>
                                {deal.referralPartner && (
                                  <span className="deal-referral">Referral: {deal.referralPartner}</span>
                                )}
                                {deal.campaign && (
                                  <span className="deal-campaign">Campaign: {deal.campaign}</span>
                                )}
                              </div>
                              {/* Business Name for Business Brokers */}
                              {deal.businessUnit === 'Business Brokers' && deal.businessName && (
                                <div className="deal-business-name">
                                  <span className="business-name-label">Business:</span>
                                  <span className="business-name-value">{deal.businessName}</span>
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