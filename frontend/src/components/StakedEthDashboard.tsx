import React, { useState, useEffect } from 'react';
import { GraphQLClient } from '../utils/graphql';
import { StakedEthAnalytics, StakedEthAnalyticsInput, StakedEthStats } from '@eigen-layer-dashboard/lib';
import AnalyticsTable from './AnalyticsTable';
import './StakedEthDashboard.css';

const StakedEthDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<StakedEthAnalytics[]>([]);
  const [stats, setStats] = useState<StakedEthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  
  // Filter states
  const [queryType, setQueryType] = useState<'single' | 'range'>('single');
  const [blockNumber, setBlockNumber] = useState<number>(18001984);
  const [startBlock, setStartBlock] = useState<number>(18001980);
  const [endBlock, setEndBlock] = useState<number>(18001990);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let input: StakedEthAnalyticsInput;
      
      switch (queryType) {
        case 'single':
          input = { blockNumber };
          break;
        case 'range':
          input = { startBlock, endBlock };
          break;
        default:
          input = { blockNumber };
      }
      
      const response = await GraphQLClient.getStakedEthAnalytics(input);
      setAnalytics(response.stakedEthAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await GraphQLClient.getStakedEthStats();
      setStats(response.stakedEthStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnalytics();
  };

  const handleQuickRange = (hours: number) => {
    const currentBlock = stats?.lastBlock || 18000000;
    const blocksPerHour = 225; // Approximate blocks per hour
    const blockRange = hours * blocksPerHour;
    
    setQueryType('range');
    setStartBlock(Math.max(currentBlock - blockRange, 0));
    setEndBlock(currentBlock);
  };

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };

  return (
    <div className="staked-eth-dashboard">
      {isHeaderVisible && (
        <div className="dashboard-header">
          <div className="header-content">
            <h2>Staked ETH Analytics Dashboard</h2>
            <p>Monitor Ethereum 2.0 staking deposits and analyze staking patterns</p>
            <div className="data-context-note">
              <p><strong>📊 Data Context:</strong> This dashboard shows staking data from the indexed database. Time ranges are relative to the most recent indexed data, not the current time.</p>
            </div>
          </div>
        </div>
      )}

      {isHeaderVisible && (
        <>
          {stats && (
            <div className="stats-overview">
              <div className="stat-card">
                <h4>Total Events</h4>
                <p className="stat-value">{stats.totalEvents.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <h4>Total Staked</h4>
                <p className="stat-value">{(parseFloat(stats.totalAmount) / 1e18).toFixed(2)} ETH</p>
              </div>
              <div className="stat-card">
                <h4>Last Block</h4>
                <p className="stat-value">{stats.lastBlock.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="dashboard-controls">
            <form onSubmit={handleSubmit} className="query-form">
              <div className="form-group">
                <label>Query Type:</label>
                <select 
                  value={queryType} 
                  onChange={(e) => setQueryType(e.target.value as 'single' | 'range')}
                >
                  <option value="single">Single Block</option>
                  <option value="range">Block Range</option>
                </select>
              </div>

              {queryType === 'single' && (
                <div className="form-group">
                  <label>Block Number:</label>
                  <input
                    type="number"
                    value={blockNumber}
                    onChange={(e) => setBlockNumber(parseInt(e.target.value) || 0)}
                    placeholder="Enter block number"
                  />
                </div>
              )}

              {queryType === 'range' && (
                <>
                  <div className="form-group">
                    <label>Start Block:</label>
                    <input
                      type="number"
                      value={startBlock}
                      onChange={(e) => setStartBlock(parseInt(e.target.value) || 0)}
                      placeholder="Start block"
                    />
                  </div>
                  <div className="form-group">
                    <label>End Block:</label>
                    <input
                      type="number"
                      value={endBlock}
                      onChange={(e) => setEndBlock(parseInt(e.target.value) || 0)}
                      placeholder="End block"
                    />
                  </div>
                </>
              )}

              <button type="submit" className="query-button" disabled={loading}>
                {loading ? 'Loading...' : 'Query Analytics'}
              </button>
            </form>

            <div className="quick-actions">
              <h4>Quick Ranges:</h4>
              <div className="quick-buttons">
                <button onClick={() => handleQuickRange(1)}>Last Hour</button>
                <button onClick={() => handleQuickRange(6)}>Last 6 Hours</button>
                <button onClick={() => handleQuickRange(24)}>Last 24 Hours</button>
                <button onClick={() => handleQuickRange(168)}>Last Week</button>
              </div>
            </div>
          </div>
        </>
      )}

      <AnalyticsTable 
        data={analytics} 
        loading={loading} 
        error={error}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
      />
    </div>
  );
};

export default StakedEthDashboard;
