import React, { useState } from 'react';
import { StakedEthAnalytics } from '@eigen-layer-dashboard/lib';
import { formatTimestamp, formatBlockNumber, formatEventCount, formatEthAmount } from '../utils/formatters';
import './AnalyticsTable.css';

interface AnalyticsTableProps {
  data: StakedEthAnalytics[];
  loading?: boolean;
  error?: string | null;
  itemsPerPage?: number;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
}

const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ 
  data, 
  loading, 
  error, 
  itemsPerPage = 10, 
  showToggleButton = false, 
  isHeaderVisible = true, 
  onToggleHeader 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  
  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  if (loading) {
    return (
      <div className="analytics-table-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-table-container">
        <div className="error-message">
          <h3>⚠️ Error Loading Data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="analytics-table-container">
        <div className="no-data">
          <p>No analytics data available for the selected range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-table-container">
      <div className="table-header">
        <div className="table-header-content">
          <div className="table-title-section">
            <h3>Staked ETH Analytics</h3>
            <p>
              Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} block{data.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>
          {showToggleButton && onToggleHeader && (
            <button 
              className="toggle-header-btn"
              onClick={onToggleHeader}
              title={isHeaderVisible ? 'Hide header and configuration' : 'Show header and configuration'}
            >
              {isHeaderVisible ? '▲ Hide Header' : '▶ Show Header'}
            </button>
          )}
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Block Number</th>
              <th>Timestamp</th>
              <th>Total Deposited</th>
              <th>Event Count</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={`${item.blockNumber}-${startIndex + index}`} className={item.eventCount === 0 ? 'no-events' : ''}>
                <td className="block-number">
                  {formatBlockNumber(item.blockNumber)}
                </td>
                <td className="timestamp">
                  {formatTimestamp(item.blockTimestamp)}
                </td>
                <td className="amount">
                  {item.eventCount === 0 ? 'No deposits' : formatEthAmount(item.totalDeposited)}
                </td>
                <td className="event-count">
                  {formatEventCount(item.eventCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              title="Previous page"
            >
              ← Previous
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current page
                const shouldShow = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1);
                
                if (!shouldShow) {
                  // Show ellipsis for gaps
                  if (page === 2 && currentPage > 4) {
                    return <span key={`ellipsis-${page}`} className="pagination-ellipsis">...</span>;
                  }
                  if (page === totalPages - 1 && currentPage < totalPages - 3) {
                    return <span key={`ellipsis-${page}`} className="pagination-ellipsis">...</span>;
                  }
                  return null;
                }
                
                return (
                  <button
                    key={page}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                    title={`Go to page ${page}`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTable;
