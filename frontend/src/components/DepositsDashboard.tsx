import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Collapse
} from '@mui/material';
import { Refresh, FilterList } from '@mui/icons-material';
import DepositsTable from './DepositsTable';
import { queryDeposits, queryTokens } from '../utils/graphql';

interface Deposit {
  id: string;
  token: {
    name: string;
    symbol: string;
    address: string;
  };
  staker: {
    address: string;
  };
  shares: string;
  strategy: {
    id: string;
  };
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
}

interface Token {
  address: string;
  name: string;
  symbol: string;
}

const DepositsDashboard: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState('blockTimestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };
  
  // Filter states
  const [staker, setStaker] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [minShares, setMinShares] = useState('');
  const [maxShares, setMaxShares] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Token search states
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokenSearchText, setTokenSearchText] = useState('');
  const [showTokenHints, setShowTokenHints] = useState(false);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [activeFilters, setActiveFilters] = useState(0);

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startTimestamp = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : undefined;
      const endTimestamp = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : undefined;
      
      const result = await queryDeposits(
        skip,
        limit,
        staker || undefined,
        tokenAddress || undefined,
        minShares || undefined,
        maxShares || undefined,
        startTimestamp,
        endTimestamp
      );
      
      setDeposits(result.deposits);
    } catch (err: any) {
      setError(err.message);
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  }, [skip, limit, staker, tokenAddress, minShares, maxShares, startTime, endTime]);

  const fetchTokens = useCallback(async () => {
    try {
      const result = await queryTokens();
      setTokens(result.tokens || []);
    } catch (err: any) {
      console.error('Error fetching tokens:', err);
    }
  }, []);

  // Filter tokens based on search text
  useEffect(() => {
    if (tokenSearchText.trim() === '') {
      setFilteredTokens([]);
      setShowTokenHints(false);
    } else {
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(tokenSearchText.toLowerCase()) ||
        token.name.toLowerCase().includes(tokenSearchText.toLowerCase())
      );
      setFilteredTokens(filtered);
      setShowTokenHints(filtered.length > 0);
    }
  }, [tokenSearchText, tokens]);

  useEffect(() => {
    fetchDeposits();
    fetchTokens();
  }, [fetchDeposits, fetchTokens]);

  useEffect(() => {
    // Count active filters
    let count = 0;
    if (staker) count++;
    if (selectedToken) count++;
    if (minShares) count++;
    if (maxShares) count++;
    if (startTime) count++;
    if (endTime) count++;
    setActiveFilters(count);
  }, [staker, selectedToken, minShares, maxShares, startTime, endTime]);

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

  const handleTokenSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTokenSearchText(event.target.value);
  };

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);
    setTokenSearchText(`${token.symbol} - ${token.name}`);
    setTokenAddress(token.address);
    setShowTokenHints(false);
  };

  const handleTokenInputFocus = () => {
    if (tokenSearchText.trim() !== '' && filteredTokens.length > 0) {
      setShowTokenHints(true);
    }
  };

  const handleTokenInputBlur = () => {
    // Delay hiding hints to allow clicking on them
    setTimeout(() => setShowTokenHints(false), 200);
  };

  const handleClearFilters = () => {
    setStaker('');
    setTokenAddress('');
    setSelectedToken(null);
    setTokenSearchText('');
    setMinShares('');
    setMaxShares('');
    setStartTime('');
    setEndTime('');
    setSkip(0);
  };

  const handleRefresh = () => {
    setSkip(0);
    fetchDeposits();
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  };

  const getQuickTimeRanges = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    return [
      { label: 'Last 24 Hours', start: formatDateForInput(oneDayAgo), end: formatDateForInput(now) },
      { label: 'Last Week', start: formatDateForInput(oneWeekAgo), end: formatDateForInput(now) },
      { label: 'Last 30 Days', start: formatDateForInput(oneMonthAgo), end: formatDateForInput(now) },
      { label: 'Last 365 Days', start: formatDateForInput(oneYearAgo), end: formatDateForInput(now) },
    ];
  };

  const handleQuickRange = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    setSkip(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Deposits Analytics
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View and analyze deposit transactions from the EigenLayer subgraph
      </Typography>

      {/* Header Section */}
      <Collapse in={isHeaderVisible} timeout="auto" unmountOnExit>
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" gap={2} alignItems="center">
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
                  <MenuItem value={200}>200</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                disabled={activeFilters === 0}
                size="small"
              >
                Clear Filters
              </Button>
            </Box>
            <Box display="flex" gap={1}>
              {getQuickTimeRanges().map((range) => (
                <Button
                  key={range.label}
                  variant="outlined"
                  size="small"
                  onClick={() => handleQuickRange(range.start, range.end)}
                >
                  {range.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Filters */}
          <Box>
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
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Staker Address"
                  value={staker}
                  onChange={(e) => setStaker(e.target.value)}
                  placeholder="0x..."
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box position="relative">
                  <TextField
                    fullWidth
                    label="Token"
                    value={tokenSearchText}
                    onChange={handleTokenSearchChange}
                    onFocus={handleTokenInputFocus}
                    onBlur={handleTokenInputBlur}
                    placeholder="Search by symbol or name..."
                    size="small"
                  />
                  {showTokenHints && (
                    <Paper
                      elevation={3}
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        maxHeight: 200,
                        overflow: 'auto',
                        mt: 0.5,
                      }}
                    >
                      {filteredTokens.map((token, index) => (
                        <Box
                          key={token.address}
                          onClick={() => handleTokenSelect(token)}
                          sx={{
                            p: 1.5,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                            borderBottom: index < filteredTokens.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {token.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {token.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" fontFamily="monospace">
                            {token.address}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Min Shares (ETH)"
                  value={minShares}
                  onChange={(e) => setMinShares(e.target.value)}
                  placeholder="0"
                  type="number"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Max Shares (ETH)"
                  value={maxShares}
                  onChange={(e) => setMaxShares(e.target.value)}
                  placeholder="1000000"
                  type="number"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Collapse>

      {/* Table */}
      <DepositsTable
        deposits={deposits}
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
          Showing {deposits.length} deposits
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
            disabled={deposits.length < limit || loading}
            size="small"
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default DepositsDashboard;
