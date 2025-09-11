import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Collapse,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Grid,
  Paper,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { GraphQLClient } from '../utils/graphql';
import { StakedEthAnalytics, StakedEthAnalyticsInput, StakedEthStats } from '@eigen-layer-dashboard/lib';
import AnalyticsTable from './AnalyticsTable';

const StakedEthDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<StakedEthAnalytics[]>([]);
  const [stats, setStats] = useState<StakedEthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  
  const toggleHeaderVisibility = () => {
    setIsHeaderVisible(!isHeaderVisible);
  };
  
  // Filter states
  const [queryType, setQueryType] = useState<'single' | 'range'>('single');
  const [blockNumber, setBlockNumber] = useState<number>(18001984);
  const [startBlock, setStartBlock] = useState<number>(18001980);
  const [endBlock, setEndBlock] = useState<number>(18001990);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let input: StakedEthAnalyticsInput;
      
      switch (queryType) {
        case 'single':
          input = { blockNumber };
          break;
        case 'range':
          input = { startBlock, endBlock };
          break;
        default:
          input = { blockNumber };
      }
      
      const response = await GraphQLClient.getStakedEthAnalytics(input);
      setAnalytics(response.stakedEthAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await GraphQLClient.getStakedEthStats();
      setStats(response.stakedEthStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnalytics();
  };

  const handleQuickRange = (hours: number) => {
    const currentBlock = stats?.lastBlock || 18000000;
    const blocksPerHour = 225; // Approximate blocks per hour
    const blockRange = hours * blocksPerHour;
    
    setQueryType('range');
    setStartBlock(Math.max(currentBlock - blockRange, 0));
    setEndBlock(currentBlock);
  };


  return (
    <Stack spacing={4}>
      {/* Header Section */}
      <Collapse in={isHeaderVisible} timeout="auto" unmountOnExit>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" component="h2" gutterBottom>
                Staked ETH Analytics Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Monitor Ethereum 2.0 staking deposits and analyze staking patterns
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, borderLeft: 4, borderColor: 'info.main' }}>
                <Typography variant="body2" color="info.dark">
                  <strong>📊 Data Context:</strong> This dashboard shows staking data from the indexed database. Time ranges are relative to the most recent indexed data, not the current time.
                </Typography>
              </Box>
            </Box>

            {/* Main Content Row */}
            <Grid container spacing={4}>
              {/* Stats Cards */}
              <Grid item xs={12} md={3}>
                {stats && (
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader 
                      title="Statistics" 
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ pt: 1, pb: 2, flexGrow: 1 }}>
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                            Total Events
                          </Typography>
                          <Typography variant="h5" component="div" color="primary">
                            {stats.totalEvents.toLocaleString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                            Total Staked
                          </Typography>
                          <Typography variant="h5" component="div" color="success.main">
                            {(parseFloat(stats.totalAmount) / 1e18).toFixed(2)} ETH
                          </Typography>
                        </Box>
                        <Box>
                          <Typography color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                            Last Block
                          </Typography>
                          <Typography variant="h5" component="div" color="warning.main">
                            {stats.lastBlock.toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Grid>

              {/* Query Configuration */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader title="Query Configuration" />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box component="form" onSubmit={handleSubmit} noValidate>
                      <Stack spacing={3}>
                        <FormControl>
                          <FormLabel>Query Type</FormLabel>
                          <RadioGroup
                            value={queryType}
                            onChange={(e) => setQueryType(e.target.value as 'single' | 'range')}
                            row
                          >
                            <FormControlLabel value="single" control={<Radio />} label="Single Block" />
                            <FormControlLabel value="range" control={<Radio />} label="Block Range" />
                          </RadioGroup>
                        </FormControl>

                        {queryType === 'single' && (
                          <TextField
                            fullWidth
                            label="Block Number"
                            type="number"
                            value={blockNumber}
                            onChange={(e) => setBlockNumber(parseInt(e.target.value) || 0)}
                            placeholder="Enter block number"
                          />
                        )}

                        {queryType === 'range' && (
                          <Stack direction="row" spacing={2}>
                            <TextField
                              fullWidth
                              label="Start Block"
                              type="number"
                              value={startBlock}
                              onChange={(e) => setStartBlock(parseInt(e.target.value) || 0)}
                              placeholder="Start block"
                            />
                            <TextField
                              fullWidth
                              label="End Block"
                              type="number"
                              value={endBlock}
                              onChange={(e) => setEndBlock(parseInt(e.target.value) || 0)}
                              placeholder="End block"
                            />
                          </Stack>
                        )}

                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={loading}
                          startIcon={loading ? <Refresh className="rotating" /> : undefined}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {loading ? 'Loading...' : 'Query Analytics'}
                        </Button>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Quick Ranges */}
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader title="Quick Ranges" />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={2}>
                      <Button variant="outlined" onClick={() => handleQuickRange(24)}>
                        LAST 24 HOURS
                      </Button>
                      <Button variant="outlined" onClick={() => handleQuickRange(168)}>
                        LAST WEEK
                      </Button>
                      <Button variant="outlined" onClick={() => handleQuickRange(720)}>
                        LAST 30 DAYS
                      </Button>
                      <Button variant="outlined" onClick={() => handleQuickRange(8760)}>
                        LAST 365 DAYS
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Collapse>

      {/* Analytics Table */}
      <AnalyticsTable 
        data={analytics} 
        loading={loading} 
        error={error}
        showToggleButton={true}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={toggleHeaderVisibility}
      />
    </Stack>
  );
};

export default StakedEthDashboard;
