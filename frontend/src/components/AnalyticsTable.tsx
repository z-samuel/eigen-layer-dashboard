import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { StakedEthAnalytics } from '@eigen-layer-dashboard/lib';
import { formatTimestamp, formatBlockNumber, formatEventCount, formatEthAmount } from '../utils/formatters';

interface AnalyticsTableProps {
  data: StakedEthAnalytics[];
  loading?: boolean;
  error?: string | null;
  itemsPerPage?: number;
  showToggleButton?: boolean;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
}

const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ 
  data, 
  loading, 
  error, 
  itemsPerPage = 10, 
  showToggleButton = false, 
  isHeaderVisible = true, 
  onToggleHeader 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  
  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading analytics data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6" component="div" gutterBottom>
          ⚠️ Error Loading Data
        </Typography>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="body1" color="text.secondary">
          No analytics data available for the selected range.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={1} sx={{ overflow: 'hidden' }}>
      {/* Table Header */}
      <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'grey.200' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h6" component="h3" gutterBottom>
              Staked ETH Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} block{data.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
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
              <TableCell><strong>Block Number</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
              <TableCell><strong>Total Deposited</strong></TableCell>
              <TableCell><strong>Event Count</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((item, index) => (
              <TableRow 
                key={`${item.blockNumber}-${startIndex + index}`}
                sx={{ 
                  '&:hover': { bgcolor: 'grey.50' },
                  ...(item.eventCount === 0 && { opacity: 0.6 })
                }}
              >
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {formatBlockNumber(item.blockNumber)}
                </TableCell>
                <TableCell>
                  {formatTimestamp(item.blockTimestamp)}
                </TableCell>
                <TableCell>
                  {item.eventCount === 0 ? (
                    <Typography color="text.secondary" fontStyle="italic">
                      No deposits
                    </Typography>
                  ) : (
                    formatEthAmount(item.totalDeposited)
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={formatEventCount(item.eventCount)} 
                    size="small"
                    color={item.eventCount === 0 ? 'default' : 'primary'}
                    variant={item.eventCount === 0 ? 'outlined' : 'filled'}
                  />
                </TableCell>
              </TableRow>
            ))}
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
              onChange={(_, page) => handlePageChange(page)}
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

export default AnalyticsTable;
