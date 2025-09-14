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
  TableSortLabel,
  Link,
  Box,
  Chip,
  IconButton
} from '@mui/material';
import { OpenInNew, Visibility, VisibilityOff } from '@mui/icons-material';

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

interface OperatorsTableProps {
  operators: Operator[];
  loading: boolean;
  error: string | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
  onStrategyClick?: (operatorId: string, operatorAddress: string) => void;
  onAVSClick?: (operatorId: string, operatorAddress: string) => void;
  onStakerClick?: (operatorId: string, operatorAddress: string) => void;
}

const OperatorsTable: React.FC<OperatorsTableProps> = ({
  operators,
  loading,
  error,
  sortBy,
  sortDirection,
  onSort,
  showToggleButton = false,
  isHeaderVisible = true,
  onToggleHeader,
  onStrategyClick,
  onAVSClick,
  onStakerClick
}) => {
  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEtherscanAddressUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  const getEtherscanUrl = (txHash: string) => {
    return `https://etherscan.io/tx/${txHash}`;
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

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading operators...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Error: {error}</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" component="h2">
            Operators
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and analyze operator data from the EigenLayer subgraph
          </Typography>
        </Box>
        {showToggleButton && (
          <IconButton onClick={onToggleHeader} size="small">
            {isHeaderVisible ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        )}
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'id'}
                  direction={sortBy === 'id' ? sortDirection : 'asc'}
                  onClick={() => onSort('id')}
                >
                  Operator Address
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'strategyCount'}
                  direction={sortBy === 'strategyCount' ? sortDirection : 'asc'}
                  onClick={() => onSort('strategyCount')}
                >
                  Strategies
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'stakerCount'}
                  direction={sortBy === 'stakerCount' ? sortDirection : 'asc'}
                  onClick={() => onSort('stakerCount')}
                >
                  Stakers
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'avsCount'}
                  direction={sortBy === 'avsCount' ? sortDirection : 'asc'}
                  onClick={() => onSort('avsCount')}
                >
                  AVS Count
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'slashingCount'}
                  direction={sortBy === 'slashingCount' ? sortDirection : 'asc'}
                  onClick={() => onSort('slashingCount')}
                >
                  Slashing Count
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'registeredBlockTimestamp'}
                  direction={sortBy === 'registeredBlockTimestamp' ? sortDirection : 'asc'}
                  onClick={() => onSort('registeredBlockTimestamp')}
                >
                  Registered
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'lastUpdateBlockTimestamp'}
                  direction={sortBy === 'lastUpdateBlockTimestamp' ? sortDirection : 'asc'}
                  onClick={() => onSort('lastUpdateBlockTimestamp')}
                >
                  Last Updated
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {operators.map((operator) => (
              <TableRow key={operator.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {formatAddress(operator.id)}
                    </Typography>
                    <Link
                      href={getEtherscanAddressUrl(operator.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <OpenInNew sx={{ fontSize: 10 }} />
                    </Link>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={operator.strategyCount}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => onStrategyClick?.(operator.id, operator.id)}
                    sx={{ 
                      cursor: onStrategyClick ? 'pointer' : 'default',
                      '&:hover': onStrategyClick ? { 
                        backgroundColor: 'primary.light', 
                        color: 'white' 
                      } : {}
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={operator.stakerCount}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    onClick={() => onStakerClick?.(operator.id, operator.id)}
                    sx={{ 
                      cursor: onStakerClick ? 'pointer' : 'default',
                      '&:hover': onStakerClick ? { 
                        backgroundColor: 'secondary.light', 
                        color: 'white' 
                      } : {}
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={operator.avsCount}
                    size="small"
                    color="success"
                    variant="outlined"
                    onClick={() => onAVSClick?.(operator.id, operator.id)}
                    sx={{ 
                      cursor: onAVSClick ? 'pointer' : 'default',
                      '&:hover': onAVSClick ? { 
                        backgroundColor: 'success.light', 
                        color: 'white' 
                      } : {}
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={operator.slashingCount}
                    size="small"
                    color={operator.slashingCount > 0 ? 'error' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {formatDate(operator.registeredBlockTimestamp)}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        {formatAddress(operator.registeredTransactionHash)}
                      </Typography>
                      <Link
                        href={getEtherscanUrl(operator.registeredTransactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        <OpenInNew sx={{ fontSize: 10 }} />
                      </Link>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {formatDate(operator.lastUpdateBlockTimestamp)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      Block #{formatBlockNumber(operator.lastUpdateBlockNumber)}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OperatorsTable;
