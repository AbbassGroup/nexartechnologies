import React, { useEffect, useState } from 'react';
import '../styles/AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const AdminDashboard = () => {
  const [totalUsers, setTotalUsers] = useState(null);

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setTotalUsers(Array.isArray(data.data) ? data.data.length : 0);
      } catch (error) {
        setTotalUsers(0);
      }
    };
    fetchTotalUsers();
  }, []);

  return (
    <div className="dashboard-main-container">
      
      <div className="dashboard-section">
        <div className="stats-cards">
          <div className="stat-card"><div>Total Users</div><span className="user-count-highlight">{totalUsers !== null ? totalUsers : '--'}</span></div>
          <div className="stat-card"><div>Total Leads</div><span>164</span></div>
          <div className="stat-card"><div>Active Deals</div><span>42</span></div>
          <div className="stat-card"><div>Closed Deals</div><span>18</span></div>
        </div>
      </div>
      <div className="dashboard-section dashboard-row">
        {/* Performance by Role (Chart Placeholder) */}
        <div className="performance-card">
          <div className="card-title">Performance by Role</div>
          <div className="chart-placeholder">[Bar Chart Here]</div>
        </div>
        {/* Recent Activity */}
        <div className="activity-card">
          <div className="card-title">Recent Activity</div>
          <ul className="activity-list">
            <li><strong>New user added</strong><br /><span>2 hours ago</span></li>
            <li><strong>Deal closed - $45,000</strong><br /><span>5 hours ago</span></li>
            <li><strong>New lead assigned</strong><br /><span>Yesterday</span></li>
          </ul>
        </div>
      </div>
      <div className="dashboard-section">
        <div className="leads-card">
          <div className="card-title">Recent Leads</div>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Smith</td>
                <td>Business Brokers</td>
                <td>Nick Johnson</td>
                <td>New</td>
                <td>Today</td>
              </tr>
              <tr>
                <td>Sarah Williams</td>
                <td>Global Properties</td>
                <td>Emma Davis</td>
                <td>Contacted</td>
                <td>Yesterday</td>
              </tr>
              <tr>
                <td>Robert Johnson</td>
                <td>Finance</td>
                <td>Mike Thompson</td>
                <td>Qualified</td>
                <td>May 7, 2025</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 