import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Users = () => {
  const { user, canManageUsers } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    businessUnit: '',
    office: '',
    role: 'manager' // Default role
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    businessUnit: '',
    office: '',
    role: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [offices, setOffices] = useState([]);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    fetchUsers();
    fetchBusinessUnits();
    fetchOffices();
  }, []);

  const fetchBusinessUnits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/business-units`);
      const data = await response.json();
      setBusinessUnits(data.data || []);
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
    setFetching(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/all-users`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to fetch users. Please try again later.');
      setUsers([]);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageUsers()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Failed to create user');
      }
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        businessUnit: '',
        office: '',
        role: 'manager'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    if (!canManageUsers()) return;

    setEditUserId(user._id || user.id);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // Do not prefill password
      businessUnit: user.businessUnit || '',
      office: user.office || '',
      role: user.role || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!canManageUsers()) return;

    setEditLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${editUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });
      if (!response.ok) throw new Error('Failed to update user');
      setIsEditModalOpen(false);
      setEditUserId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (userId) => {
    if (!canManageUsers()) return;
    setDeleteUserId(userId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId || !canManageUsers()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${deleteUserId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      setIsDeleteModalOpen(false);
      setDeleteUserId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    selectedRole === 'all' ? true : user.role === selectedRole
  );

  if (!canManageUsers()) {
    return <div>You don't have permission to access this page.</div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <div className="header-left">
          <h2>Users Management</h2>
          <p className="subtitle">Manage your team members and their account permissions</p>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="role-filter" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="roleFilter" style={{ fontWeight: '500' }}>Filter by Role:</label>
            <select
              id="roleFilter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                minWidth: '150px'
              }}
            >
              <option value="all">All Roles</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <button className="add-user-btn" onClick={() => setIsModalOpen(true)}>
            <span className="plus-icon">+</span>
            Add User
          </button>
        </div>
      </div>

      <div className="users-table-container">
        {error && (
          <div className="error-message" style={{
            padding: '12px',
            margin: '12px',
            backgroundColor: '#ffebee',
            color: '#d32f2f',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Business Unit</th>
              <th>Office</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fetching ? (
              <tr><td colSpan="7">Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="7">No users found.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id || user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    {
                      businessUnits.find(unit => unit.name === user.businessUnit)?.name ||
                      user.businessUnit
                    }
                  </td>
                  <td>
                    {
                      offices.find(office => office.name === user.office)?.name ||
                      user.office
                    }
                  </td>
                  <td><span className="status-badge active">Active</span></td>
                  <td>
                    <button className="action-btn edit" onClick={() => handleEditClick(user)}>Edit</button>
                    <button className="action-btn delete" onClick={() => handleDeleteClick(user._id || user.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header user-modal-header">
              <h2 className="modal-title">Add New User</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="user-form-sectioned">
              <div className="form-section">
                <div className="form-section-title">Personal Information</div>
                <div className="form-group-row">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="form-group-row">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title">Account Information</div>
                <div className="form-group-row">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div className="form-group-row">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className="form-group-row">
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title">Access Information</div>
                <div className="form-group-row">
                  <label>Business Unit</label>
                  <select
                    name="businessUnit"
                    value={formData.businessUnit}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Business Unit</option>
                    {businessUnits.map(unit => (
                      <option key={unit.name} value={unit.name}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-row">
                  <label>Office</label>
                  <select
                    name="office"
                    value={formData.office}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Office</option>
                    {offices.map(office => (
                      <option key={office.name} value={office.name}>{office.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header user-modal-header">
              <h2 className="modal-title">Edit User</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="user-form-sectioned">
              <div className="form-section">
                <div className="form-section-title">Personal Information</div>
                <div className="form-group-row">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editFormData.firstName}
                    onChange={handleEditInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="form-group-row">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editFormData.lastName}
                    onChange={handleEditInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title">Account Information</div>
                <div className="form-group-row">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div className="form-group-row">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditInputChange}
                    placeholder="Enter new password (leave blank to keep current)"
                  />
                </div>
                <div className="form-group-row">
                  <label>Role</label>
                  <select
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title">Access Information</div>
                <div className="form-group-row">
                  <label>Business Unit</label>
                  <select
                    name="businessUnit"
                    value={editFormData.businessUnit}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="">Select Business Unit</option>
                    {businessUnits.map(unit => (
                      <option key={unit.name} value={unit.name}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-row">
                  <label>Office</label>
                  <select
                    name="office"
                    value={editFormData.office}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="">Select Office</option>
                    {offices.map(office => (
                      <option key={office.name} value={office.name}>{office.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="delete-btn" onClick={handleDeleteUser}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 