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
  Box,
  CircularProgress,
  Alert,
  Chip,
  TableSortLabel,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import { OpenInNew, Visibility, VisibilityOff } from '@mui/icons-material';

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

interface DepositsTableProps {
  deposits: Deposit[];
  loading: boolean;
  error: string | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
}

const DepositsTable: React.FC<DepositsTableProps> = ({
  deposits,
  loading,
  error,
  sortBy,
  sortDirection,
  onSort,
  showToggleButton = false,
  isHeaderVisible = true,
  onToggleHeader
}) => {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatShares = (shares: string): string => {
    return `${(parseFloat(shares) / 1e18).toFixed(6)} ETH`;
  };

  const formatAddress = (address: string): string => {
    if (address === 'unknown') return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBlockNumber = (blockNumber: number): string => {
    return blockNumber.toLocaleString();
  };

  const getEtherscanUrl = (txHash: string): string => {
    return `https://etherscan.io/tx/${txHash}`;
  };

  const getEtherscanAddressUrl = (address: string): string => {
    return `https://etherscan.io/address/${address}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (deposits.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No deposits found matching the current filters.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" component="h3" gutterBottom>
            Deposits
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deposit transactions from the EigenLayer subgraph
          </Typography>
        </Box>
        {showToggleButton && onToggleHeader && (
          <Tooltip title={isHeaderVisible ? 'Hide header and configuration' : 'Show header and configuration'}>
            <IconButton onClick={onToggleHeader} color="primary">
              {isHeaderVisible ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
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
                Deposit ID
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'token'}
                direction={sortBy === 'token' ? sortDirection : 'asc'}
                onClick={() => onSort('token')}
              >
                Token
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'staker'}
                direction={sortBy === 'staker' ? sortDirection : 'asc'}
                onClick={() => onSort('staker')}
              >
                Staker
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'shares'}
                direction={sortBy === 'shares' ? sortDirection : 'asc'}
                onClick={() => onSort('shares')}
              >
                Shares
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'strategy'}
                direction={sortBy === 'strategy' ? sortDirection : 'asc'}
                onClick={() => onSort('strategy')}
              >
                Strategy
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'blockNumber'}
                direction={sortBy === 'blockNumber' ? sortDirection : 'asc'}
                onClick={() => onSort('blockNumber')}
              >
                Block #
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'blockTimestamp'}
                direction={sortBy === 'blockTimestamp' ? sortDirection : 'asc'}
                onClick={() => onSort('blockTimestamp')}
              >
                Block Timestamp
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">
              <Typography variant="body2" fontWeight="bold">
                Transaction Hash
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deposits.map((deposit) => (
            <TableRow key={deposit.id} hover>
              <TableCell>
                <Chip
                  label={formatAddress(deposit.id)}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
              </TableCell>
              <TableCell>
                <Box>
                  {deposit.token.address === 'unknown' ? (
                    <Typography variant="body2" color="text.secondary">
                      UNKNOWN
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2" fontWeight="medium">
                        {deposit.token.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {deposit.token.symbol}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {formatAddress(deposit.token.address)}
                      </Typography>
                    </>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Link
                  href={getEtherscanAddressUrl(deposit.staker.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    textDecoration: 'none',
                    color: 'primary.main',
                    fontFamily: 'monospace',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {formatAddress(deposit.staker.address)}
                  <OpenInNew sx={{ fontSize: 10, ml: 0.5 }} />
                </Link>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {formatShares(deposit.shares)}
                </Typography>
              </TableCell>
              <TableCell>
                <Link
                  href={getEtherscanAddressUrl(deposit.strategy.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    textDecoration: 'none',
                    color: 'primary.main',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {formatAddress(deposit.strategy.id)}
                  <OpenInNew sx={{ fontSize: 10, ml: 0.5 }} />
                </Link>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {formatBlockNumber(deposit.blockNumber)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(deposit.blockTimestamp)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Link
                  href={getEtherscanUrl(deposit.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    textDecoration: 'none',
                    color: 'primary.main',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {formatAddress(deposit.transactionHash)}
                  <OpenInNew sx={{ fontSize: 10, ml: 0.5 }} />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </Box>
  );
};

export default DepositsTable;
