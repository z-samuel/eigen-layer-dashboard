import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert,
  TableSortLabel,
  Link
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

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

interface OperatorSetsTableProps {
  operatorSets: OperatorSet[];
  loading: boolean;
  error: string | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
  onOperatorClick?: (operatorSetId: string, operatorSetAddress: string) => void;
  onStrategyClick?: (operatorSetId: string, operatorSetAddress: string) => void;
}

const OperatorSetsTable: React.FC<OperatorSetsTableProps> = ({
  operatorSets,
  loading,
  error,
  sortBy,
  sortDirection,
  onSort,
  showToggleButton = false,
  isHeaderVisible = true,
  onToggleHeader,
  onOperatorClick,
  onStrategyClick
}) => {
  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatOperatorSetId = (id: string) => {
    if (!id) return 'N/A';
    return `${id.slice(0, 10)}....`;
  };

  const getEtherscanAddressUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatBlockNumber = (blockNumber: number) => {
    if (!blockNumber) return 'N/A';
    return blockNumber.toLocaleString();
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table>
        {isHeaderVisible && (
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'id'}
                  direction={sortBy === 'id' ? sortDirection : 'asc'}
                  onClick={() => handleSort('id')}
                >
                  Operator Set ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'avs.id'}
                  direction={sortBy === 'avs.id' ? sortDirection : 'asc'}
                  onClick={() => handleSort('avs.id')}
                >
                  AVS
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'owner'}
                  direction={sortBy === 'owner' ? sortDirection : 'asc'}
                  onClick={() => handleSort('owner')}
                >
                  Owner
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'operatorCount'}
                  direction={sortBy === 'operatorCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('operatorCount')}
                >
                  Operators
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'strategyCount'}
                  direction={sortBy === 'strategyCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('strategyCount')}
                >
                  Strategies
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'stakerCount'}
                  direction={sortBy === 'stakerCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('stakerCount')}
                >
                  Stakers
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'slashingCount'}
                  direction={sortBy === 'slashingCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('slashingCount')}
                >
                  Slashing
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'lastUpdateBlockTimestamp'}
                  direction={sortBy === 'lastUpdateBlockTimestamp' ? sortDirection : 'asc'}
                  onClick={() => handleSort('lastUpdateBlockTimestamp')}
                >
                  Last Updated
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {operatorSets.map((operatorSet) => (
            <TableRow key={operatorSet.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {formatOperatorSetId(operatorSet.id)}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatAddress(operatorSet.avs.id)}
                  </Typography>
                  <Link
                    href={getEtherscanAddressUrl(operatorSet.avs.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <OpenInNew sx={{ fontSize: 12 }} />
                  </Link>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatAddress(operatorSet.owner)}
                  </Typography>
                  <Link
                    href={getEtherscanAddressUrl(operatorSet.owner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <OpenInNew sx={{ fontSize: 12 }} />
                  </Link>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={operatorSet.operatorCount}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onClick={() => onOperatorClick?.(operatorSet.id, operatorSet.id)}
                  sx={{ 
                    cursor: onOperatorClick ? 'pointer' : 'default',
                    '&:hover': onOperatorClick ? { 
                      backgroundColor: 'primary.light', 
                      color: 'white' 
                    } : {}
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={operatorSet.strategyCount}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  onClick={() => onStrategyClick?.(operatorSet.id, operatorSet.id)}
                  sx={{ 
                    cursor: onStrategyClick ? 'pointer' : 'default',
                    '&:hover': onStrategyClick ? { 
                      backgroundColor: 'secondary.light', 
                      color: 'white' 
                    } : {}
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={operatorSet.stakerCount}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={operatorSet.slashingCount}
                  size="small"
                  color={operatorSet.slashingCount > 0 ? 'error' : 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {formatDate(operatorSet.lastUpdateBlockTimestamp)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Block #{formatBlockNumber(operatorSet.lastUpdateBlockNumber)}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OperatorSetsTable;
