// src/pages/LoginPage.js
import React from 'react';
import Login from '../components/Login';

const LoginPage = () => {
  const handleLogin = (credentials) => {
    // For now, just log the credentials
    console.log(credentials);
    // Later, you’ll call your backend API here
  };

  return (
    <div style={{ minHeight: '100vh', background: '#e9eef4',display: 'flex',
        alignItems: 'center',
        justifyContent: 'center' }}>
      <Login onLogin={handleLogin} />
    </div>
  );
};

export default LoginPage;