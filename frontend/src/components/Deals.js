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
  'Business Broker': [
    'Enquiry', 'Initial Consultation', 'Proposal sent', 'Backlog for FLUP', 'Engagement Signed', 'Ad launch', 'Under offer', 'Settled, Invoice paid',
    'Nurture', 'DNQ', 'Closed Lost', 'CLOSED. Do Not Contact'
  ]
};

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Deals = () => {
  const query = useQuery();
  const [businessUnits, setBusinessUnits] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      
      // Set default selected unit based on role
      if (!selectedUnit && (data.data && data.data.length > 0)) {
        if (user.role === 'manager' && user.businessUnits && user.businessUnits.length > 0) {
          setSelectedUnit(user.businessUnits[0]);
        } else {
          setSelectedUnit(data.data[0].name);
        }
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

  // Handle drag end and update backend
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // Check if the user has permission to move this deal
    const deal = deals.find(d => d._id === draggableId);
    if (!deal) return;

    // Role-based validation for drag and drop
    if (user.role === 'manager') {
      // Managers can only drag deals from their office
      if (deal.office !== user.office) {
        setError('You can only move deals from your office location');
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/deals/${draggableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: destination.droppableId,
          sourceStage: source.droppableId,
          sourceIndex: source.index,
          destinationIndex: destination.index
        }),
      });

      if (!response.ok) throw new Error('Failed to update deal stage');

      // Update local state
      const updatedDeals = Array.from(deals);
      const [movedDeal] = updatedDeals.splice(source.index, 1);
      updatedDeals.splice(destination.index, 0, {
        ...movedDeal,
        stage: destination.droppableId
      });

      setDeals(updatedDeals);
    } catch (error) {
      setError('Failed to update deal stage');
      console.error('Error updating deal:', error);
    }
  };

  const handleBusinessUnitChange = (e) => {
    setSelectedUnit(e.target.value);
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
            onClick={() => navigate(`/deals/create?businessUnit=${encodeURIComponent(selectedUnit)}`)}
          >
            Create Deal
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

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
                          key={deal._id}
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
                              <h4>{deal.name}</h4>
                              <div className="deal-details">
                                <span className="deal-owner">{deal.owner}</span>
                                <span className="deal-office">{deal.office}</span>
                              </div>
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