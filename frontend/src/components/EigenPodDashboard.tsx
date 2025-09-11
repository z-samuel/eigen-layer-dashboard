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
  CardHeader,
  Grid,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { EigenPod, EigenPodResponse, EigenPodWhereInput } from '@eigen-layer-dashboard/lib';
import { queryEigenPods } from '../utils/graphql';
import EigenPodTable from './EigenPodTable';

const EigenPodDashboard: React.FC = () => {
  const [eigenPods, setEigenPods] = useState<EigenPod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [filters, setFilters] = useState<EigenPodWhereInput>({});
  const [skip, setSkip] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5000);
  const [total, setTotal] = useState<number>(0);

  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };

  const fetchEigenPods = async (currentSkip: number = 0, currentLimit: number = 5000, currentFilters: EigenPodWhereInput = {}) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching EigenPods with params:', { currentSkip, currentLimit, currentFilters });
      
      // Now try the actual query
      const response: EigenPodResponse = await queryEigenPods(currentSkip, currentLimit, currentFilters);
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
    fetchEigenPods(skip, limit, filters);
  }, [skip, limit, filters]);

  const handleFilterChange = (newFilters: EigenPodWhereInput) => {
    setFilters(newFilters);
    setSkip(0); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    const newSkip = (page - 1) * limit;
    setSkip(newSkip);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0); // Reset to first page when limit changes
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

            {/* Filters Section */}
            <Card>
              <CardHeader title="Filters" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Owner Address"
                      placeholder="0x..."
                      value={filters.ownerAddress || ''}
                      onChange={(e) => handleFilterChange({ ...filters, ownerAddress: e.target.value || undefined })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="EigenPod Address"
                      placeholder="0x..."
                      value={filters.eigenPodAddress || ''}
                      onChange={(e) => handleFilterChange({ ...filters, eigenPodAddress: e.target.value || undefined })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Start Block"
                      type="number"
                      placeholder="e.g., 18000000"
                      value={filters.startBlock || ''}
                      onChange={(e) => handleFilterChange({ ...filters, startBlock: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="End Block"
                      type="number"
                      placeholder="e.g., 19000000"
                      value={filters.endBlock || ''}
                      onChange={(e) => handleFilterChange({ ...filters, endBlock: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => handleFilterChange({})}
                    startIcon={<Refresh />}
                  >
                    Clear Filters
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Pagination Controls */}
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Items per page</InputLabel>
                    <Select
                      value={limit}
                      label="Items per page"
                      onChange={(e) => handleLimitChange(parseInt(e.target.value as string))}
                    >
                      <MenuItem value={100}>100</MenuItem>
                      <MenuItem value={500}>500</MenuItem>
                      <MenuItem value={1000}>1,000</MenuItem>
                      <MenuItem value={5000}>5,000</MenuItem>
                      <MenuItem value={10000}>10,000</MenuItem>
                    </Select>
                  </FormControl>
                  
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