import React, { useEffect, useState } from 'react';
import '../styles/AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const BusinessSetting = () => {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [offices, setOffices] = useState([]);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch business units and offices on mount
  useEffect(() => {
    fetchBusinessUnits();
    fetchOffices();
  }, []);

  const fetchBusinessUnits = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/business-units`);
      const data = await res.json();
      setBusinessUnits(data.data || []);
    } catch (err) {
      setBusinessUnits([]);
    }
  };

  const fetchOffices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/offices`);
      const data = await res.json();
      setOffices(data.data || []);
    } catch (err) {
      setOffices([]);
    }
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/business-units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: unitName })
      });
      setUnitName('');
      setShowUnitModal(false);
      fetchBusinessUnits();
    } catch (err) {} finally { setLoading(false); }
  };

  const handleAddOffice = async (e) => {
    e.preventDefault();
    if (!officeName.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/offices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: officeName })
      });
      setOfficeName('');
      setShowOfficeModal(false);
      fetchOffices();
    } catch (err) {} finally { setLoading(false); }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm('Delete this business unit?')) return;
    await fetch(`${API_BASE_URL}/api/business-units/${id}`, { method: 'DELETE' });
    fetchBusinessUnits();
  };

  const handleDeleteOffice = async (id) => {
    if (!window.confirm('Delete this office?')) return;
    await fetch(`${API_BASE_URL}/api/offices/${id}`, { method: 'DELETE' });
    fetchOffices();
  };

  return (
    <div className="business-settings-container">
      <h1 className="business-settings-title">Business Settings</h1>
      <div className="settings-sections">
        {/* Business Units Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-title">Business Units</span>
            <button className="add-btn" onClick={() => setShowUnitModal(true)}>Add Business Unit</button>
          </div>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {businessUnits.length === 0 ? (
                <tr><td colSpan={2}>No business units found.</td></tr>
              ) : businessUnits.map(unit => (
                <tr key={unit._id}>
                  <td>{unit.name}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDeleteUnit(unit._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Locations Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-title">Locations</span>
            <button className="add-btn" onClick={() => setShowOfficeModal(true)}>Add Location</button>
          </div>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {offices.length === 0 ? (
                <tr><td colSpan={2}>No locations found.</td></tr>
              ) : offices.map(office => (
                <tr key={office._id}>
                  <td>{office.name}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDeleteOffice(office._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Business Unit Modal */}
      {showUnitModal && (
        <div className="modal-overlay" onClick={() => setShowUnitModal(false)}>
          <div className="modal-content business-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Business Unit</h2>
              <button className="close-btn" onClick={() => setShowUnitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddUnit}>
              <div className="modal-body">
                <input
                  type="text"
                  className="modal-input"
                  value={unitName}
                  onChange={e => setUnitName(e.target.value)}
                  placeholder="Business unit name"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowUnitModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Office Modal */}
      {showOfficeModal && (
        <div className="modal-overlay" onClick={() => setShowOfficeModal(false)}>
          <div className="modal-content business-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Location</h2>
              <button className="close-btn" onClick={() => setShowOfficeModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddOffice}>
              <div className="modal-body">
                <input
                  type="text"
                  className="modal-input"
                  value={officeName}
                  onChange={e => setOfficeName(e.target.value)}
                  placeholder="Location name"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowOfficeModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessSetting; 