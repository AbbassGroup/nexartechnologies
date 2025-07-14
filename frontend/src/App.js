// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './components/AdminDashboard';
import Users from './components/Users';
import Deals from './components/Deals';
import './App.css';
import CreateDeal from './components/CreateDeal';
import BusinessSetting from './components/BusinessSetting';
import ForgetPassword from './components/ForgetPassword';
import Contacts from './components/Contacts';
import CreateContact from './components/CreateContact';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
};

// Protected Prospects Route Component
const ProtectedProspectsRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

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

  if (!canAccessProspects()) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={
                <ProtectedRoute requiredRole="super_admin">
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="prospects" element={
                <ProtectedProspectsRoute>
                  <Contacts/>
                </ProtectedProspectsRoute>
              } />
              <Route path="prospects/create" element={
                <ProtectedProspectsRoute>
                  <CreateContact />
                </ProtectedProspectsRoute>
              } />
              <Route path="deals" element={<Deals />} />
              <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />
              <Route path="business-setting" element={
                <ProtectedRoute requiredRole="super_admin">
                  <BusinessSetting />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/deals/create" element={<CreateDeal />} />
            <Route path="/forget-password" element={<ForgetPassword />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;