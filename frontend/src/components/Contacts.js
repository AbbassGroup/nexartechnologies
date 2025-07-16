import React, { useEffect, useState } from 'react';
import '../styles/Deals.css';
import '../styles/CreateDeal.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';


const API_BASE_URL = process.env.REACT_APP_API_URL;

const FILTERABLE_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'industry', label: 'Industry' },
  { key: 'businessType', label: 'Business Type' },
  { key: 'priceRange', label: 'Price Range' },
  { key: 'location', label: 'Location' },
  { key: 'city', label: 'City' },
  { key: 'contactOwner', label: 'Contact Owner' }
];

const FILTER_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'equals' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' }
];

const Contacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({}); // { field: { operator, value, enabled } }
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, contactId: null, contactName: '' });
  const [editModal, setEditModal] = useState({ show: false, contactId: null });
  const [editForm, setEditForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const SEARCHABLE_FIELDS = [
    'firstName', 'lastName', 'phone', 'email', 'industry',
    'businessType', 'priceRange', 'location', 'city', 'contactOwner'
  ];

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredContacts(contacts);
    } else {
      const lower = search.toLowerCase();
      setFilteredContacts(
        contacts.filter(contact =>
          SEARCHABLE_FIELDS.some(
            field =>
              contact[field] &&
              contact[field].toString().toLowerCase().includes(lower)
          )
        )
      );
    }
  }, [search, contacts]);

  // Filtering logic for filter panel
  useEffect(() => {
    let filtered = contacts;
    // Apply advanced filters
    Object.entries(filters).forEach(([field, filter]) => {
      if (filter.enabled && filter.value) {
        filtered = filtered.filter(contact => {
          const val = (contact[field] || '').toString().toLowerCase();
          const filterVal = filter.value.toLowerCase();
          switch (filter.operator) {
            case 'equals':
              return val === filterVal;
            case 'startsWith':
              return val.startsWith(filterVal);
            case 'endsWith':
              return val.endsWith(filterVal);
            case 'contains':
            default:
              return val.includes(filterVal);
          }
        });
      }
    });
    // Apply global search as well
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(contact =>
        SEARCHABLE_FIELDS.some(
          field =>
            contact[field] &&
            contact[field].toString().toLowerCase().includes(lower)
        )
      );
    }
    setFilteredContacts(filtered);
  }, [contacts, filters, search]);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contacts.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export contacts');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting contacts');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/import`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setImportResult(result);
        // Refresh contacts list
        await fetchContacts();
        // Clear file input
        setImportFile(null);
        // Close modal after a delay
        setTimeout(() => {
          setShowImportModal(false);
          setImportResult(null);
        }, 3000);
      } else {
        alert(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing contacts');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        e.target.value = '';
        return;
      }
      
      setImportFile(file);
    }
  };

  // Filter panel handlers
  const handleFilterFieldToggle = (field) => {
    setFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        enabled: !prev[field]?.enabled,
        operator: prev[field]?.operator || 'contains',
        value: prev[field]?.value || ''
      }
    }));
  };
  const handleFilterOperatorChange = (field, operator) => {
    setFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        operator
      }
    }));
  };
  const handleFilterValueChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value
      }
    }));
  };

  // Delete contact handler
  const handleDeleteContact = async (contactId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete contact');
      // Refresh contacts
      await fetchContacts();
      setDeleteConfirm({ show: false, contactId: null, contactName: '' });
    } catch (error) {
      alert('Failed to delete contact');
    }
  };

  // Edit contact handler (navigate to edit page)
  const handleEditContact = (contactId) => {
    navigate(`/admin-dashboard/prospects/edit/${contactId}`);
  };

  // Open edit modal and fetch contact details
  const openEditModal = async (contactId) => {
    setEditLoading(true);
    setEditError('');
    setEditModal({ show: true, contactId });
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`);
      const data = await response.json();
      if (data.success) {
        setEditForm(data.data);
      } else {
        setEditError('Failed to load prospect details');
      }
    } catch (error) {
      setEditError('Failed to load prospect details');
    } finally {
      setEditLoading(false);
    }
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ show: false, contactId: null });
    setEditForm(null);
    setEditError('');
  };

  // Handle edit form changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle edit form submit
  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/${editModal.contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (data.success) {
        await fetchContacts();
        closeEditModal();
      } else {
        setEditError(data.error || 'Failed to update prospect');
      }
    } catch (error) {
      setEditError('Failed to update prospect');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div className="deals-container" style={{ flex: 1 }}>
        <div className="deals-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Prospects</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
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
                opacity: exporting ? 0.6 : 1
              }}
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <button 
              className="import-btn" 
              onClick={() => setShowImportModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Import Excel
            </button>
            <button className="create-contact-btn" onClick={() => navigate('/admin-dashboard/prospects/create')}>
              Create Prospects <span style={{ fontSize: '1.1em', marginLeft: 4 }}>▼</span>
            </button>
          </div>
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
                {(user.role === 'admin' || user.role === 'super_admin') && <th>Actions</th>}
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
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <td>
                        <button
                          style={{ marginRight: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#1976d2' }}
                          title="Edit Prospect"
                          onClick={() => openEditModal(c._id)}
                        >
                          ✏️
                        </button>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f' }}
                          title="Delete Prospect"
                          onClick={() => setDeleteConfirm({ show: true, contactId: c._id, contactName: `${c.firstName} ${c.lastName}` })}
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              minWidth: '400px',
              maxWidth: '500px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Import Contacts from Excel</h3>
              
              {importResult ? (
                <div style={{
                  padding: '15px',
                  backgroundColor: importResult.data.errors > 0 ? '#fff3cd' : '#d4edda',
                  border: `1px solid ${importResult.data.errors > 0 ? '#ffeaa7' : '#c3e6cb'}`,
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: importResult.data.errors > 0 ? '#856404' : '#155724' }}>
                    {importResult.message}
                  </h4>
                  {importResult.data.errorDetails && importResult.data.errorDetails.length > 0 && (
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {importResult.data.errorDetails.map((error, index) => (
                        <div key={index} style={{ fontSize: '12px', marginBottom: '5px', color: '#856404' }}>
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p style={{ marginBottom: '20px', color: '#666' }}>
                    Upload an Excel file (.xlsx or .xls) with the following columns:
                  </p>
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '4px', 
                    marginBottom: '20px',
                    fontSize: '12px'
                  }}>
                    <strong>Required columns:</strong> First Name, Last Name, Phone, Email<br/>
                    <strong>Optional columns:</strong> Industry, Business Type, Price Range, Location, City, Contact Owner
                  </div>
                  
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ marginBottom: '20px', width: '100%' }}
                  />
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFile(null);
                        setImportResult(null);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!importFile || importing}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: importing ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: importing ? 'not-allowed' : 'pointer',
                        opacity: importing ? 0.6 : 1
                      }}
                    >
                      {importing ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Filter Panel */}
      <div style={{
        width: 280,
        minWidth: 220,
        background: '#fafbfc',
        borderLeft: '1.5px solid #e0e4ea',
        padding: '24px 16px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        boxShadow: '0 0 8px 0 rgba(0,0,0,0.03)'
      }}>
        <h4 style={{ marginTop: 0, marginBottom: 18, fontWeight: 600 }}>Filter Prospects</h4>
        {FILTERABLE_FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={!!filters[f.key]?.enabled}
                onChange={() => handleFilterFieldToggle(f.key)}
                style={{ marginRight: 8 }}
              />
              {f.label}
            </label>
            {filters[f.key]?.enabled && (
              <div style={{ marginLeft: 24, marginTop: 6 }}>
                <select
                  value={filters[f.key]?.operator || 'contains'}
                  onChange={e => handleFilterOperatorChange(f.key, e.target.value)}
                  style={{ marginRight: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid #e0e4ea' }}
                >
                  {FILTER_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={filters[f.key]?.value || ''}
                  onChange={e => handleFilterValueChange(f.key, e.target.value)}
                  placeholder="Type here"
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #e0e4ea', minWidth: 100 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete the prospect "{deleteConfirm.contactName}"?</p>
            <p>This action cannot be undone.</p>
            <div className="delete-modal-buttons">
              <button
                className="delete-confirm-btn"
                onClick={() => handleDeleteContact(deleteConfirm.contactId)}
              >
                Delete
              </button>
              <button
                className="delete-cancel-btn"
                onClick={() => setDeleteConfirm({ show: false, contactId: null, contactName: '' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Prospect Modal */}
      {editModal.show && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit Prospect</h3>
              <button className="close-modal-btn" onClick={closeEditModal}>×</button>
            </div>
            {editError && <div className="error-message">{editError}</div>}
            {editLoading || !editForm ? (
              <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
            ) : (
              <form onSubmit={handleEditFormSubmit} className="edit-form">
                <div className="edit-form-section">
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>First Name *</label>
                      <input type="text" name="firstName" value={editForm.firstName || ''} onChange={handleEditFormChange} required />
                    </div>
                    <div className="edit-form-group">
                      <label>Last Name *</label>
                      <input type="text" name="lastName" value={editForm.lastName || ''} onChange={handleEditFormChange} required />
                    </div>
                  </div>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Phone *</label>
                      <input type="text" name="phone" value={editForm.phone || ''} onChange={handleEditFormChange} required />
                    </div>
                    <div className="edit-form-group">
                      <label>Email *</label>
                      <input type="email" name="email" value={editForm.email || ''} onChange={handleEditFormChange} required />
                    </div>
                  </div>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Industry</label>
                      <input type="text" name="industry" value={editForm.industry || ''} onChange={handleEditFormChange} />
                    </div>
                    <div className="edit-form-group">
                      <label>Business Type</label>
                      <input type="text" name="businessType" value={editForm.businessType || ''} onChange={handleEditFormChange} />
                    </div>
                  </div>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Price Range</label>
                      <input type="text" name="priceRange" value={editForm.priceRange || ''} onChange={handleEditFormChange} />
                    </div>
                    <div className="edit-form-group">
                      <label>Location</label>
                      <input type="text" name="location" value={editForm.location || ''} onChange={handleEditFormChange} />
                    </div>
                  </div>
                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>City</label>
                      <input type="text" name="city" value={editForm.city || ''} onChange={handleEditFormChange} />
                    </div>
                    <div className="edit-form-group">
                      <label>Contact Owner</label>
                      <input type="text" name="contactOwner" value={editForm.contactOwner || ''} onChange={handleEditFormChange} />
                    </div>
                  </div>
                </div>
                <div className="edit-form-actions">
                  <button type="button" className="cancel-btn" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts; 