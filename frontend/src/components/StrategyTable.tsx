import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Link,
  Button,
  TableSortLabel
} from '@mui/material';
import { Visibility, VisibilityOff, OpenInNew } from '@mui/icons-material';
import { Strategy } from '@eigen-layer-dashboard/lib/frontend-types';

type SortField = 'lastUpdateBlockTimestamp' | 'createdAtBlockNumber' | 'totalShares' | 'operatorCount' | 'stakerCount' | 'avsCount';
type SortDirection = 'asc' | 'desc';

interface StrategyTableProps {
  data: Strategy[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

const StrategyTable: React.FC<StrategyTableProps> = ({
  data,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  showToggleButton = false,
  isHeaderVisible = true,
  onToggleHeader,
  sortField,
  sortDirection = 'desc',
  onSort
}) => {

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEtherscanAddressUrl = (address: string): string => {
    return `https://etherscan.io/address/${address}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    return `${dateStr} ${timeStr}`;
  };

  const formatBlockNumber = (blockNumber: number) => {
    return blockNumber.toLocaleString();
  };

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1e18) {
      return (num / 1e18).toFixed(2);
    } else if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toLocaleString();
  };

  const getEtherscanUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading Strategy data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6" component="div" gutterBottom>
          Error Loading Strategy Data
        </Typography>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  return (
    <Paper elevation={1} sx={{ overflow: 'hidden' }}>
      {/* Table Header */}
      <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'grey.200' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h6" component="h3" gutterBottom>
              Strategy Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              EigenLayer strategies and their performance metrics
            </Typography>
          </Box>
          {showToggleButton && onToggleHeader && (
            <Tooltip title={isHeaderVisible ? 'Hide header and configuration' : 'Show header and configuration'}>
              <IconButton onClick={onToggleHeader} color="primary">
                {isHeaderVisible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Strategy Address</strong></TableCell>
              <TableCell><strong>Token</strong></TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'totalShares'}
                  direction={sortField === 'totalShares' ? sortDirection : 'asc'}
                  onClick={() => onSort?.('totalShares')}
                >
                  <strong>Total Shares</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell><strong>Exchange Rate</strong></TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'operatorCount'}
                  direction={sortField === 'operatorCount' ? sortDirection : 'asc'}
                  onClick={() => onSort?.('operatorCount')}
                >
                  <strong>Operators</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'stakerCount'}
                  direction={sortField === 'stakerCount' ? sortDirection : 'asc'}
                  onClick={() => onSort?.('stakerCount')}
                >
                  <strong>Stakers</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'avsCount'}
                  direction={sortField === 'avsCount' ? sortDirection : 'asc'}
                  onClick={() => onSort?.('avsCount')}
                >
                  <strong>AVS Count</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'createdAtBlockNumber'}
                  direction={sortField === 'createdAtBlockNumber' ? sortDirection : 'asc'}
                  onClick={() => onSort?.('createdAtBlockNumber')}
                >
                  <strong>Created At Block #</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'lastUpdateBlockTimestamp'}
                  direction={sortField === 'lastUpdateBlockTimestamp' ? sortDirection : 'asc'}
                  onClick={() => onSort?.('lastUpdateBlockTimestamp')}
                >
                  <strong>Last Updated</strong>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No Strategy data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((strategy) => (
                <TableRow 
                  key={strategy.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    <Tooltip title={strategy.address}>
                      <Link
                        href={getEtherscanUrl(strategy.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          textDecoration: 'none',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        <Typography variant="body2">
                          {formatAddress(strategy.address)}
                        </Typography>
                      </Link>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {strategy.token.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {strategy.token.name}
                      </Typography>
                      {strategy.token.address !== 'unknown' && (
                        <>
                          <br />
                          <Link
                            href={getEtherscanAddressUrl(strategy.token.address)}
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
                            {formatAddress(strategy.token.address)}
                            <OpenInNew sx={{ fontSize: 10, ml: 0.5 }} />
                          </Link>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatNumber(strategy.totalShares)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatNumber(strategy.exchangeRate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {strategy.operatorCount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {strategy.stakerCount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {strategy.avsCount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatBlockNumber(strategy.createdAtBlockNumber)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(strategy.lastUpdateBlockTimestamp)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: 1, borderColor: 'grey.200' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Page {currentPage} of {totalPages}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default StrategyTable;
