import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Collapse,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Strategy, StrategyResponse } from '@eigen-layer-dashboard/lib/frontend-types';
import { queryStrategies } from '../utils/graphql';
import StrategyTable from './StrategyTable';

const StrategyDashboard: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [skip, setSkip] = useState<number>(0);
  const [limit, setLimit] = useState<number>(50);
  const [sortField, setSortField] = useState<'lastUpdateBlockTimestamp' | 'createdAtBlockNumber' | 'totalShares' | 'operatorCount' | 'stakerCount' | 'avsCount'>('lastUpdateBlockTimestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };

  const fetchStrategies = useCallback(async (currentSkip: number = 0, currentLimit: number = 50) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching Strategies with params:', { currentSkip, currentLimit, sortField, sortDirection });
      
      const response: StrategyResponse = await queryStrategies(currentSkip, currentLimit);
      console.log('Strategies response:', response);
      
      // Sort the strategies locally based on the selected field and direction
      const sortedStrategies = [...response.strategies].sort((a, b) => {
        let aValue: number;
        let bValue: number;
        
        switch (sortField) {
          case 'lastUpdateBlockTimestamp':
            aValue = a.lastUpdateBlockTimestamp;
            bValue = b.lastUpdateBlockTimestamp;
            break;
          case 'createdAtBlockNumber':
            aValue = a.createdAtBlockNumber;
            bValue = b.createdAtBlockNumber;
            break;
          case 'totalShares':
            aValue = parseFloat(a.totalShares);
            bValue = parseFloat(b.totalShares);
            break;
          case 'operatorCount':
            aValue = a.operatorCount;
            bValue = b.operatorCount;
            break;
          case 'stakerCount':
            aValue = a.stakerCount;
            bValue = b.stakerCount;
            break;
          case 'avsCount':
            aValue = a.avsCount;
            bValue = b.avsCount;
            break;
          default:
            aValue = a.lastUpdateBlockTimestamp;
            bValue = b.lastUpdateBlockTimestamp;
        }
        
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
      
      setStrategies(sortedStrategies);
    } catch (err: any) {
      console.error('Error fetching Strategies:', err);
      setError(err.message || 'Failed to fetch Strategy data');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDirection]);

  useEffect(() => {
    fetchStrategies(skip, limit);
  }, [fetchStrategies, skip, limit]);

  const handlePageChange = (page: number) => {
    if (page > currentPage) {
      // Next page: advance skip by current limit
      setSkip(skip + limit);
    } else if (page < currentPage) {
      // Previous page: subtract limit until 0
      const newSkip = Math.max(0, skip - limit);
      setSkip(newSkip);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0); // Reset to first page when limit changes
  };

  const handleSort = (field: 'lastUpdateBlockTimestamp' | 'createdAtBlockNumber' | 'totalShares' | 'operatorCount' | 'stakerCount' | 'avsCount') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection('desc');
    }
    setSkip(0); // Reset to first page when sorting changes
  };

  // Since subgraph doesn't provide total count, we'll estimate based on current data
  // If we have fewer items than the limit, we're on the last page
  const isLastPage = strategies.length < limit;
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = isLastPage ? currentPage : currentPage + 1;

  return (
    <Stack spacing={4}>
      {/* Header Section */}
      <Collapse in={isHeaderVisible} timeout="auto" unmountOnExit>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Strategy Analytics Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Monitor EigenLayer strategies and their performance metrics
              </Typography>
              {loading && (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading Strategy data...
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Pagination Controls */}
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Items per page</InputLabel>
                    <Select
                      value={limit}
                      label="Items per page"
                      onChange={(e) => handleLimitChange(Number(e.target.value))}
                    >
                      <MenuItem value={20}>20</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip 
                      label={`Showing: ${strategies.length} strategies`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`Page ${currentPage} of ${totalPages}`} 
                      color="secondary" 
                      variant="outlined" 
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Paper>
      </Collapse>

      {/* Strategy Table */}
      <StrategyTable
        data={strategies}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </Stack>
  );
};

export default StrategyDashboard;
