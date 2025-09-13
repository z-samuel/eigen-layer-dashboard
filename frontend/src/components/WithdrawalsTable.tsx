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
} from '@mui/material';
import { OpenInNew, Visibility, VisibilityOff } from '@mui/icons-material';

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

interface WithdrawalsTableProps {
  withdrawals: Withdrawal[];
  loading: boolean;
  error: string | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
}

const WithdrawalsTable: React.FC<WithdrawalsTableProps> = ({
  withdrawals,
  loading,
  error,
  sortBy,
  sortDirection,
  onSort,
  showToggleButton = false,
  isHeaderVisible = true,
  onToggleHeader
}) => {
  const getEtherscanUrl = (txHash: string) => {
    return `https://etherscan.io/tx/${txHash}`;
  };

  const getEtherscanAddressUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  const formatAddress = (address: string): string => {
    if (address === 'unknown') return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number): string => {
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

  const formatShares = (shares: string): string => {
    return `${(parseFloat(shares) / 1e18).toFixed(6)} ETH`;
  };

  const getStatusColor = (status: string, completed: boolean) => {
    if (completed) return 'success';
    if (status === 'QUEUED') return 'warning';
    if (status === 'COMPLETE') return 'success';
    if (status === 'FAILED') return 'error';
    return 'default';
  };

  const getStatusText = (status: string, completed: boolean) => {
    if (completed) return 'Completed';
    if (status === 'QUEUED') return 'QUEUED';
    if (status === 'COMPLETE') return 'COMPLETE';
    return status || 'Unknown';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Withdrawals Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and analyze withdrawal transactions from the EigenLayer subgraph
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
                  Withdrawal ID
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
                  active={sortBy === 'operator'}
                  direction={sortBy === 'operator' ? sortDirection : 'asc'}
                  onClick={() => onSort('operator')}
                >
                  Operator
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'withdrawer'}
                  direction={sortBy === 'withdrawer' ? sortDirection : 'asc'}
                  onClick={() => onSort('withdrawer')}
                >
                  Withdrawer
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
                  active={sortBy === 'status'}
                  direction={sortBy === 'status' ? sortDirection : 'asc'}
                  onClick={() => onSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'startBlockTimestamp'}
                  direction={sortBy === 'startBlockTimestamp' ? sortDirection : 'asc'}
                  onClick={() => onSort('startBlockTimestamp')}
                >
                  Start Time & Transaction
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'completedBlockTimestamp'}
                  direction={sortBy === 'completedBlockTimestamp' ? sortDirection : 'asc'}
                  onClick={() => onSort('completedBlockTimestamp')}
                >
                  Completed Time & Transaction
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.id} hover>
                <TableCell>
                  <Chip
                    label={formatAddress(withdrawal.id)}
                    size="small"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {formatAddress(withdrawal.staker.id)}
                    </Typography>
                    <Link
                      href={getEtherscanAddressUrl(withdrawal.staker.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <OpenInNew sx={{ fontSize: 10 }} />
                    </Link>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {formatAddress(withdrawal.operator.id)}
                    </Typography>
                    <Link
                      href={getEtherscanAddressUrl(withdrawal.operator.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <OpenInNew sx={{ fontSize: 10 }} />
                    </Link>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {formatAddress(withdrawal.withdrawer)}
                    </Typography>
                    <Link
                      href={getEtherscanAddressUrl(withdrawal.withdrawer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <OpenInNew sx={{ fontSize: 10 }} />
                    </Link>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatShares(withdrawal.shares)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(withdrawal.status.id, withdrawal.completed)}
                    color={getStatusColor(withdrawal.status.id, withdrawal.completed)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {formatDate(withdrawal.startBlockTimestamp)}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        {formatAddress(withdrawal.startTransactionHash)}
                      </Typography>
                      <Link
                        href={getEtherscanUrl(withdrawal.startTransactionHash)}
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
                  {withdrawal.completedTransactionHash ? (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {formatDate(withdrawal.completedBlockTimestamp)}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {formatAddress(withdrawal.completedTransactionHash)}
                        </Typography>
                        <Link
                          href={getEtherscanUrl(withdrawal.completedTransactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ display: 'flex', alignItems: 'center' }}
                        >
                          <OpenInNew sx={{ fontSize: 10 }} />
                        </Link>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not completed
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default WithdrawalsTable;
