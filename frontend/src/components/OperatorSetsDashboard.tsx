import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import { Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import OperatorSetsTable from './OperatorSetsTable';
import OperatorSetOperatorsPanel from './OperatorSetOperatorsPanel';
import OperatorSetStrategiesPanel from './OperatorSetStrategiesPanel';
import { queryOperatorSets } from '../utils/graphql';

interface OperatorSet {
  id: string;
  avs: {
    id: string;
    owner: string;
    lastUpdateBlockNumber: number;
    lastUpdateBlockTimestamp: number;
  };
  owner: string;
  operatorCount: number;
  strategyCount: number;
  stakerCount: number;
  slashingCount: number;
  lastUpdateBlockNumber: number;
  lastUpdateBlockTimestamp: number;
}

const OperatorSetsDashboard: React.FC = () => {
  const [operatorSets, setOperatorSets] = useState<OperatorSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('lastUpdateBlockTimestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [operatorsPanelOpen, setOperatorsPanelOpen] = useState(false);
  const [selectedOperatorSetId, setSelectedOperatorSetId] = useState('');
  const [selectedOperatorSetAddress, setSelectedOperatorSetAddress] = useState('');
  const [strategiesPanelOpen, setStrategiesPanelOpen] = useState(false);
  const [selectedStrategyOperatorSetId, setSelectedStrategyOperatorSetId] = useState('');
  const [selectedStrategyOperatorSetAddress, setSelectedStrategyOperatorSetAddress] = useState('');

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };

  const fetchOperatorSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryOperatorSets(skip, limit);
      const operatorSetsData = result.operatorSets || [];
      setOperatorSets(operatorSetsData);
      
      // Calculate pagination info
      // If we got less data than the limit, we're on the last page
      const hasMoreData = operatorSetsData.length === limit;
      const currentTotal = skip + operatorSetsData.length;
      
      if (hasMoreData) {
        // Estimate total count (this is approximate since subgraph doesn't provide exact count)
        setTotalCount(currentTotal + 1); // Add 1 to indicate there might be more
        setTotalPages(Math.ceil((currentTotal + 1) / limit));
      } else {
        // We're on the last page
        setTotalCount(currentTotal);
        setTotalPages(Math.ceil(currentTotal / limit));
      }
    } catch (err: any) {
      console.error('Error fetching operator sets:', err);
      setError(err.message);
      setOperatorSets([]);
    } finally {
      setLoading(false);
    }
  }, [skip, limit]);

  useEffect(() => {
    fetchOperatorSets();
  }, [fetchOperatorSets]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleRefresh = () => {
    fetchOperatorSets();
  };

  const handleLimitChange = (event: any) => {
    const newLimit = parseInt(event.target.value);
    setLimit(newLimit);
    setSkip(0);
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      setSkip((newPage - 1) * limit);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      setSkip((newPage - 1) * limit);
    }
  };

  const handleOperatorClick = (operatorSetId: string, operatorSetAddress: string) => {
    setSelectedOperatorSetId(operatorSetId);
    setSelectedOperatorSetAddress(operatorSetAddress);
    setOperatorsPanelOpen(true);
  };

  const handleCloseOperatorsPanel = () => {
    setOperatorsPanelOpen(false);
    setSelectedOperatorSetId('');
    setSelectedOperatorSetAddress('');
  };

  const handleStrategyClick = (operatorSetId: string, operatorSetAddress: string) => {
    setSelectedStrategyOperatorSetId(operatorSetId);
    setSelectedStrategyOperatorSetAddress(operatorSetAddress);
    setStrategiesPanelOpen(true);
  };

  const handleCloseStrategiesPanel = () => {
    setStrategiesPanelOpen(false);
    setSelectedStrategyOperatorSetId('');
    setSelectedStrategyOperatorSetAddress('');
  };

  // Client-side sorting
  const sortedOperatorSets = [...operatorSets].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'id':
        aValue = a.id;
        bValue = b.id;
        break;
      case 'avs.id':
        aValue = a.avs.id;
        bValue = b.avs.id;
        break;
      case 'owner':
        aValue = a.owner;
        bValue = b.owner;
        break;
      case 'operatorCount':
        aValue = a.operatorCount;
        bValue = b.operatorCount;
        break;
      case 'strategyCount':
        aValue = a.strategyCount;
        bValue = b.strategyCount;
        break;
      case 'stakerCount':
        aValue = a.stakerCount;
        bValue = b.stakerCount;
        break;
      case 'slashingCount':
        aValue = a.slashingCount;
        bValue = b.slashingCount;
        break;
      case 'lastUpdateBlockTimestamp':
        aValue = a.lastUpdateBlockTimestamp;
        bValue = b.lastUpdateBlockTimestamp;
        break;
      default:
        aValue = a.lastUpdateBlockTimestamp;
        bValue = b.lastUpdateBlockTimestamp;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
      : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
  });

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Operator Sets Analytics Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Toggle Header Visibility">
            <IconButton onClick={toggleHeaderVisibility}>
              {isHeaderVisible ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Controls */}
      <Collapse in={isHeaderVisible}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Query Configuration</Typography>
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Items per page</InputLabel>
                <Select
                  value={limit}
                  label="Items per page"
                  onChange={handleLimitChange}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* Table */}
      <OperatorSetsTable
        operatorSets={sortedOperatorSets}
        loading={loading}
        error={error}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
        onOperatorClick={handleOperatorClick}
        onStrategyClick={handleStrategyClick}
      />

      {/* Pagination */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="body2" color="text.secondary">
          Page {currentPage} of {totalPages} • {totalCount} operator sets
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            onClick={handleNext}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Operators Panel */}
      <OperatorSetOperatorsPanel
        open={operatorsPanelOpen}
        onClose={handleCloseOperatorsPanel}
        operatorSetId={selectedOperatorSetId}
        operatorSetAddress={selectedOperatorSetAddress}
      />

      {/* Strategies Panel */}
      <OperatorSetStrategiesPanel
        open={strategiesPanelOpen}
        onClose={handleCloseStrategiesPanel}
        operatorSetId={selectedStrategyOperatorSetId}
        operatorSetAddress={selectedStrategyOperatorSetAddress}
      />
    </Box>
  );
};

export default OperatorSetsDashboard;
