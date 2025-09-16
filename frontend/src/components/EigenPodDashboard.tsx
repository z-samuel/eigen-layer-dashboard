import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Collapse,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button
} from '@mui/material';
import { EigenPod, EigenPodResponse, EigenPodWhereInput } from '@eigen-layer-dashboard/lib/frontend-types';
import { queryEigenPods } from '../utils/graphql';
import EigenPodTable from './EigenPodTable';

const EigenPodDashboard: React.FC = () => {
  const [eigenPods, setEigenPods] = useState<EigenPod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [skip, setSkip] = useState<number>(0);
  const [limit, setLimit] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);
  const [podOwnerFilter, setPodOwnerFilter] = useState<string>('');

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };

  const fetchEigenPods = async (currentSkip: number = 0, currentLimit: number = 50, currentPodOwnerFilter: string = '') => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching EigenPods with params:', { currentSkip, currentLimit, currentPodOwnerFilter });
      
      // Build where clause for filtering
      const where: EigenPodWhereInput | undefined = currentPodOwnerFilter.trim() 
        ? { ownerAddress: currentPodOwnerFilter.trim() }
        : undefined;
      
      // Now try the actual query
      const response: EigenPodResponse = await queryEigenPods(currentSkip, currentLimit, where);
      console.log('EigenPods response:', response);
      setEigenPods(response.pods);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Error fetching EigenPods:', err);
      setError(err.message || 'Failed to fetch EigenPod data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEigenPods(skip, limit, podOwnerFilter);
  }, [skip, limit, podOwnerFilter]);

  const handlePageChange = (page: number) => {
    const newSkip = (page - 1) * limit;
    setSkip(newSkip);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0); // Reset to first page when limit changes
  };

  const handlePodOwnerFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPodOwnerFilter(event.target.value);
    setSkip(0); // Reset to first page when filter changes
  };

  const handleClearFilter = () => {
    setPodOwnerFilter('');
    setSkip(0); // Reset to first page when clearing filter
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <Stack spacing={4}>
      {/* Header Section */}
      <Collapse in={isHeaderVisible} timeout="auto" unmountOnExit>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                EigenPod Analytics Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Monitor deployed EigenPod contracts and their owners
              </Typography>
              {loading && (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading EigenPod data...
                  </Typography>
                </Box>
              )}
            </Box>


            {/* Pagination Controls */}
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Items per page</InputLabel>
                      <Select
                        value={limit}
                        label="Items per page"
                        onChange={(e) => handleLimitChange(parseInt(e.target.value as string))}
                      >
                        <MenuItem value={20}>20</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <TextField
                      size="small"
                      label="Filter by Pod Owner"
                      placeholder="Enter address..."
                      value={podOwnerFilter}
                      onChange={handlePodOwnerFilterChange}
                      sx={{ minWidth: 250 }}
                    />
                    
                    {podOwnerFilter && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleClearFilter}
                        sx={{ minWidth: 80 }}
                      >
                        Clear
                      </Button>
                    )}
                  </Stack>
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip 
                      label={`Total: ${total.toLocaleString()}`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`Page ${currentPage} of ${totalPages}`} 
                      color="secondary" 
                      variant="outlined" 
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Paper>
      </Collapse>

      {/* EigenPod Table */}
      <EigenPodTable
        data={eigenPods}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
      />
    </Stack>
  );
};

export default EigenPodDashboard;