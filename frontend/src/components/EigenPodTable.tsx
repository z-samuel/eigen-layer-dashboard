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
  Pagination,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Link
} from '@mui/material';
import { Visibility, VisibilityOff, OpenInNew } from '@mui/icons-material';
import { EigenPod } from '@eigen-layer-dashboard/lib/frontend-types';

interface EigenPodTableProps {
  data: EigenPod[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
}

const EigenPodTable: React.FC<EigenPodTableProps> = ({
  data,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  showToggleButton = false,
  isHeaderVisible = true,
  onToggleHeader
}) => {

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEtherscanAddressUrl = (address: string): string => {
    return `https://etherscan.io/address/${address}`;
  };

  const getEtherscanUrl = (txHash: string) => {
    return `https://etherscan.io/tx/${txHash}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    return `${dateStr} ${timeStr}`;
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading EigenPod data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6" component="div" gutterBottom>
          Error Loading EigenPod Data
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
              EigenPod Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deployed EigenPod contracts and their owners
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
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>EigenPod Address</strong></TableCell>
              <TableCell><strong>Pod Owner</strong></TableCell>
              <TableCell><strong>Block Number</strong></TableCell>
              <TableCell><strong>Transaction Hash</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No EigenPod events found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((pod) => (
                <TableRow 
                  key={pod.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <TableCell>
                    <Chip label={pod.id} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    <Link
                      href={getEtherscanAddressUrl(pod.eigenPod)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      <Tooltip title={pod.eigenPod}>
                        <Typography variant="body2">
                          {formatAddress(pod.eigenPod)}
                          <OpenInNew sx={{ fontSize: 12, ml: 0.5 }} />
                        </Typography>
                      </Tooltip>
                    </Link>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    <Link
                      href={getEtherscanAddressUrl(pod.podOwner)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      <Tooltip title={pod.podOwner}>
                        <Typography variant="body2">
                          {formatAddress(pod.podOwner)}
                          <OpenInNew sx={{ fontSize: 12, ml: 0.5 }} />
                        </Typography>
                      </Tooltip>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {pod.blockNumber.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    <Tooltip title={pod.transactionHash}>
                      <Link
                        href={getEtherscanUrl(pod.transactionHash)}
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
                          {formatAddress(pod.transactionHash)}
                        </Typography>
                      </Link>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(pod.createdAt)}
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
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => onPageChange(page)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default EigenPodTable;