import React, { useState, useEffect } from 'react';
import { GraphQLClient } from './utils/graphql';
import { HealthStatus } from '@eigen-layer-dashboard/lib';
import StakedEthDashboard from './components/StakedEthDashboard';
import './App.css';

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await GraphQLClient.getHealth();
        setHealthStatus(response.health);
        setError(null);
      } catch (err) {
        setError('Failed to connect to backend API');
        console.error('Error fetching health status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthStatus();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>EigenLayer Dashboard</h1>
        <p>Monitor and manage your EigenLayer operations</p>
        
        <nav className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Staked ETH Analytics
          </button>
        </nav>
      </header>

      <main className="App-main">
        {loading && <div className="loading">Loading...</div>}
        
        {error && (
          <div className="error">
            <h3>⚠️ Connection Error</h3>
            <p>{error}</p>
            <p>Make sure the backend server is running on port 3001</p>
          </div>
        )}
        
        {activeTab === 'overview' && healthStatus && (
          <div className="overview-content">
            <div className="health-status">
              <h3>✅ Backend Status</h3>
              <div className="status-card">
                <p><strong>Status:</strong> {healthStatus.status}</p>
                <p><strong>Service:</strong> {healthStatus.service}</p>
                <p><strong>Last Updated:</strong> {new Date(healthStatus.timestamp).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="features">
              <h3>Available Features</h3>
              <ul>
                <li>✅ Staked ETH Analytics Dashboard</li>
                <li>✅ Real-time Staking Data</li>
                <li>✅ Block-level Analysis</li>
                <li>✅ Historical Data Queries</li>
                <li>🔄 EigenPod Monitoring (Coming Soon)</li>
                <li>🔄 Performance Metrics (Coming Soon)</li>
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <StakedEthDashboard />
        )}
      </main>
    </div>
  );
}

export default App;
