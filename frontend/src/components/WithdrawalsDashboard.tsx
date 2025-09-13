import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Collapse
} from '@mui/material';
import { Refresh, FilterList } from '@mui/icons-material';
import WithdrawalsTable from './WithdrawalsTable';
import { queryWithdrawals } from '../utils/graphql';

interface Withdrawal {
  id: string;
  staker: {
    id: string;
  };
  operator: {
    id: string;
  };
  strategies: Array<{
    id: string;
  }>;
  shares: string;
  scaledShares: string;
  depositShares: string;
  receiveAsTokens: boolean;
  isUndelegationQueue: boolean;
  status: {
    id: string;
  };
  completed: boolean;
  nonce: string;
  root: string;
  withdrawer: string;
  startBlockNumber: number;
  startBlockTimestamp: number;
  startTransactionHash: string;
  sharesWithdrawn: string;
  completableBlockNumber: number;
  completableMaxMagnitudes: string;
  completedBlockTimestamp: number;
  completedBlockNumber: number;
  completedTransactionHash: string;
}


const WithdrawalsDashboard: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState('startBlockTimestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };
  
  // Filter states
  const [staker, setStaker] = useState('');
  const [operator, setOperator] = useState('');
  const [withdrawer, setWithdrawer] = useState('');
  const [status, setStatus] = useState('');
  const [completed, setCompleted] = useState('');
  
  const [activeFilters, setActiveFilters] = useState(0);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const completedFilter = completed === '' ? undefined : completed === 'true';
      
      console.log('Fetching withdrawals with filters:', {
        skip,
        limit,
        staker,
        operator,
        withdrawer,
        status,
        completed: completedFilter
      });
      
      const result = await queryWithdrawals(
        skip,
        limit,
        staker || undefined,
        operator || undefined,
        withdrawer || undefined,
        undefined, // strategy
        undefined, // minShares
        undefined, // maxShares
        undefined, // startTime
        undefined, // endTime
        status || undefined,
        completedFilter
      );
      
      setWithdrawals(result.withdrawals || []);
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      setError(err.message);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [skip, limit, staker, operator, withdrawer, status, completed]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  useEffect(() => {
    // Count active filters
    let count = 0;
    if (staker) count++;
    if (operator) count++;
    if (withdrawer) count++;
    if (status) count++;
    if (completed) count++;
    setActiveFilters(count);
  }, [staker, operator, withdrawer, status, completed]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleLimitChange = (event: any) => {
    const newLimit = parseInt(event.target.value);
    setLimit(newLimit);
    setSkip(0); // Reset to first page
  };

  const handlePrevious = () => {
    if (skip > 0) {
      setSkip(Math.max(0, skip - limit));
    }
  };

  const handleNext = () => {
    setSkip(skip + limit);
  };


  const handleClearFilters = () => {
    setStaker('');
    setOperator('');
    setWithdrawer('');
    setStatus('');
    setCompleted('');
    setSkip(0);
  };

  const handleRefresh = () => {
    setSkip(0);
    fetchWithdrawals();
  };


  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Withdrawals Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and analyze withdrawal transactions from the EigenLayer subgraph
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Items per page</InputLabel>
            <Select
              value={limit}
              label="Items per page"
              onChange={handleLimitChange}
            >
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            disabled={activeFilters === 0}
          >
            Clear Filters
          </Button>
        </Box>
      </Box>


      {/* Filters */}
      <Collapse in={isHeaderVisible}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FilterList />
            <Typography variant="h6">Filters</Typography>
            {activeFilters > 0 && (
              <Chip
                label={`${activeFilters} active`}
                color="primary"
                size="small"
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="Staker Address"
                value={staker}
                onChange={(e) => setStaker(e.target.value)}
                placeholder="0x..."
                size="small"
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="Operator Address"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="0x..."
                size="small"
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="Withdrawer Address"
                value={withdrawer}
                onChange={(e) => setWithdrawer(e.target.value)}
                placeholder="0x..."
                size="small"
              />
            </Box>
            <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="QUEUED">QUEUED</MenuItem>
                  <MenuItem value="COMPLETE">COMPLETE</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Completed</InputLabel>
                <Select
                  value={completed}
                  label="Completed"
                  onChange={(e) => setCompleted(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* Table */}
      <WithdrawalsTable
        withdrawals={withdrawals}
        loading={loading}
        error={error}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
      />

      {/* Pagination Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="body2" color="text.secondary">
          Showing {withdrawals.length} withdrawals
          {activeFilters > 0 && (
            <Chip
              label={`${activeFilters} filter${activeFilters > 1 ? 's' : ''} active`}
              color="primary"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={skip === 0 || loading}
            size="small"
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            onClick={handleNext}
            disabled={withdrawals.length < limit || loading}
            size="small"
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default WithdrawalsDashboard;
