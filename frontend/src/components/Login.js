import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check for default super admin credentials
    if (email === 'superadmin' && password === 'superadmin') {
      login({
        id: '1',
        name: 'Super Admin',
        role: 'super_admin',
        businessUnits: ['Advocacy', 'Global Properties', 'Finance', 'Business Brokers'],
        office: 'All Offices'
      });
      navigate('/admin-dashboard');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        // Store user data including role and permissions
        login({
          id: data.id,
          name: data.name,
          role: data.role,
          businessUnits: data.businessUnits,
          office: data.office
        });
        navigate('/admin-dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    }
  };

  return (
    <div className="login-page-wrapper">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className='crm-name'>NEXARRR</div>
        <p>Sign in to your account</p>
        {error && <div className="error-message">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="show-password-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="login-options">
          <Link to="/forget-password">Forgot password?</Link>
        </div>
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export default Login;
