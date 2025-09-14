import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse
} from '@mui/material';
import { Refresh, FilterList } from '@mui/icons-material';
import OperatorsTable from './OperatorsTable';
import OperatorStrategiesPanel from './OperatorStrategiesPanel';
import OperatorAVSsPanel from './OperatorAVSsPanel';
import OperatorStakersPanel from './OperatorStakersPanel';
import { queryOperators } from '../utils/graphql';

interface Operator {
  id: string;
  strategyCount: number;
  operatorSetCount: number;
  stakerCount: number;
  avsCount: number;
  metadataURI: string;
  delegationApprover: string;
  slashingCount: number;
  registeredTransactionHash: string;
  registeredBlockNumber: number;
  registeredBlockTimestamp: number;
  lastUpdateBlockNumber: number;
  lastUpdateBlockTimestamp: number;
}

const OperatorsDashboard: React.FC = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState('lastUpdateBlockTimestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [strategiesPanelOpen, setStrategiesPanelOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedOperatorAddress, setSelectedOperatorAddress] = useState('');
  const [avssPanelOpen, setAvssPanelOpen] = useState(false);
  const [selectedAVSOperatorId, setSelectedAVSOperatorId] = useState('');
  const [selectedAVSOperatorAddress, setSelectedAVSOperatorAddress] = useState('');
  const [stakersPanelOpen, setStakersPanelOpen] = useState(false);
  const [selectedStakerOperatorId, setSelectedStakerOperatorId] = useState('');
  const [selectedStakerOperatorAddress, setSelectedStakerOperatorAddress] = useState('');

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching operators:', {
        skip,
        limit
      });
      
      const result = await queryOperators(skip, limit);
      
      setOperators(result.operators || []);
      setTotalCount(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / limit));
    } catch (err: any) {
      console.error('Error fetching operators:', err);
      setError(err.message);
      setOperators([]);
    } finally {
      setLoading(false);
    }
  }, [skip, limit]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

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
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    if (skip > 0) {
      setSkip(Math.max(0, skip - limit));
      setCurrentPage(Math.max(1, currentPage - 1));
    }
  };

  const handleNext = () => {
    setSkip(skip + limit);
    setCurrentPage(currentPage + 1);
  };

  const handleRefresh = () => {
    setSkip(0);
    setCurrentPage(1);
    fetchOperators();
  };

  const handleStrategyClick = (operatorId: string, operatorAddress: string) => {
    setSelectedOperatorId(operatorId);
    setSelectedOperatorAddress(operatorAddress);
    setStrategiesPanelOpen(true);
  };

  const handleCloseStrategiesPanel = () => {
    setStrategiesPanelOpen(false);
    setSelectedOperatorId('');
    setSelectedOperatorAddress('');
  };

  const handleAVSClick = (operatorId: string, operatorAddress: string) => {
    setSelectedAVSOperatorId(operatorId);
    setSelectedAVSOperatorAddress(operatorAddress);
    setAvssPanelOpen(true);
  };

  const handleCloseAVSsPanel = () => {
    setAvssPanelOpen(false);
    setSelectedAVSOperatorId('');
    setSelectedAVSOperatorAddress('');
  };

  const handleStakerClick = (operatorId: string, operatorAddress: string) => {
    setSelectedStakerOperatorId(operatorId);
    setSelectedStakerOperatorAddress(operatorAddress);
    setStakersPanelOpen(true);
  };

  const handleCloseStakersPanel = () => {
    setStakersPanelOpen(false);
    setSelectedStakerOperatorId('');
    setSelectedStakerOperatorAddress('');
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Operators Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and analyze operator performance and statistics
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
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
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FilterList />
            <Typography variant="h6">Controls</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
            
            <Typography variant="body2" color="text.secondary">
              Showing {operators.length} of {totalCount} operators
            </Typography>
          </Box>
        </Paper>
      </Collapse>

      {/* Table */}
      <OperatorsTable
        operators={operators}
        loading={loading}
        error={error}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
        onStrategyClick={handleStrategyClick}
        onAVSClick={handleAVSClick}
        onStakerClick={handleStakerClick}
      />

      {/* Pagination */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="body2" color="text.secondary">
          Page {currentPage} of {totalPages}
          {operators.length > 0 && (
            <Typography component="span" sx={{ ml: 1 }}>
              ({operators.length} operators)
            </Typography>
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
            disabled={operators.length < limit || loading}
            size="small"
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Strategies Panel */}
      <OperatorStrategiesPanel
        open={strategiesPanelOpen}
        onClose={handleCloseStrategiesPanel}
        operatorId={selectedOperatorId}
        operatorAddress={selectedOperatorAddress}
      />

      {/* AVSs Panel */}
      <OperatorAVSsPanel
        open={avssPanelOpen}
        onClose={handleCloseAVSsPanel}
        operatorId={selectedAVSOperatorId}
        operatorAddress={selectedAVSOperatorAddress}
      />

      {/* Stakers Panel */}
      <OperatorStakersPanel
        open={stakersPanelOpen}
        onClose={handleCloseStakersPanel}
        operatorId={selectedStakerOperatorId}
        operatorAddress={selectedStakerOperatorAddress}
      />
    </Box>
  );
};

export default OperatorsDashboard;
