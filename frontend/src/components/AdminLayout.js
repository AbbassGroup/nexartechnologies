import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminDashboard.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>NEXAR CRM</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink to="/admin-dashboard" end className={({ isActive }) => isActive ? 'active' : ''}>
                Dashboard
              </NavLink>
            </li>
            {user?.role === 'super_admin' && (
              <li>
                <NavLink to="/admin-dashboard/users" className={({ isActive }) => isActive ? 'active' : ''}>
                  Users
                </NavLink>
              </li>
            )}
           
            <li>
              <NavLink to="/admin-dashboard/prospects" className={({ isActive }) => isActive ? 'active' : ''}>
                Prospects
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin-dashboard/deals" className={({ isActive }) => isActive ? 'active' : ''}>
                Deals
              </NavLink>
            </li>

            {user?.role === 'super_admin' && (
              <li>
                <NavLink to="/admin-dashboard/business-setting" className={({ isActive }) => isActive ? 'active' : ''}>
                  Business Setting
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
        <div className="sidebar-footer">

          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
      <div className="main-content">
        <div className="topbar">
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1976d2' }}>NEXAR CRM</div>
          <div className="topbar-user">
            <span className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
            <span>{user?.name}</span>
            <span style={{ color: '#888', fontSize: '0.95rem' }}>{user?.role}</span>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout; 