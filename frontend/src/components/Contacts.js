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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  const SEARCHABLE_FIELDS = [
    'firstName', 'lastName', 'phone', 'email', 'industry',
    'businessType', 'priceRange', 'location', 'city', 'contactOwner'
  ];

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

  // Don't render if user doesn't have access
  if (!canAccessProspects()) {
    return null;
  }

  return (
    <div className="deals-container">
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
  );
};

export default Contacts; 