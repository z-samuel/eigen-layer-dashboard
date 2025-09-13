import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Container, 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Chip,
  Paper,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import { GraphQLClient } from './utils/graphql';
import { HealthStatus } from '@eigen-layer-dashboard/lib';
import StakedEthDashboard from './components/StakedEthDashboard';
import EigenPodDashboard from './components/EigenPodDashboard';
import StrategyDashboard from './components/StrategyDashboard';
import DepositsDashboard from './components/DepositsDashboard';
import WithdrawalsDashboard from './components/WithdrawalsDashboard';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'eigenpods' | 'strategies' | 'deposits' | 'withdrawals'>('overview');

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await GraphQLClient.getHealth();
        setHealthStatus(response.health);
        setError(null);
      } catch (err) {
        setError('Failed to connect to backend API');
        console.error('Error fetching health status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthStatus();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box minHeight="100vh" bgcolor="grey.50">
        <Paper elevation={1} sx={{ borderBottom: 1, borderColor: 'grey.200' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            <Stack spacing={4} alignItems="center">
              <Typography variant="h3" component="h1" color="text.primary" fontWeight="bold">
                EigenLayer Dashboard
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Monitor and manage your EigenLayer operations
              </Typography>
              
              <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
                <Button
                  variant={activeTab === 'overview' ? 'contained' : 'outlined'}
                  color={activeTab === 'overview' ? 'primary' : 'inherit'}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={activeTab === 'analytics' ? 'contained' : 'outlined'}
                  color={activeTab === 'analytics' ? 'primary' : 'inherit'}
                  onClick={() => setActiveTab('analytics')}
                >
                  Staked ETH Analytics
                </Button>
                <Button
                  variant={activeTab === 'eigenpods' ? 'contained' : 'outlined'}
                  color={activeTab === 'eigenpods' ? 'primary' : 'inherit'}
                  onClick={() => setActiveTab('eigenpods')}
                >
                  EigenPod
                </Button>
                <Button
                  variant={activeTab === 'strategies' ? 'contained' : 'outlined'}
                  color={activeTab === 'strategies' ? 'primary' : 'inherit'}
                  onClick={() => setActiveTab('strategies')}
                >
                  Strategy
                </Button>
                <Button
                  variant={activeTab === 'deposits' ? 'contained' : 'outlined'}
                  color={activeTab === 'deposits' ? 'primary' : 'inherit'}
                  onClick={() => setActiveTab('deposits')}
                >
                  Deposits
                </Button>
                <Button
                  variant={activeTab === 'withdrawals' ? 'contained' : 'outlined'}
                  color={activeTab === 'withdrawals' ? 'primary' : 'inherit'}
                  onClick={() => setActiveTab('withdrawals')}
                >
                  Withdrawals
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Paper>

        <Container maxWidth="xl" sx={{ py: 8 }}>
          {loading && (
            <Stack spacing={4} alignItems="center">
              <CircularProgress size={60} />
              <Typography>Loading...</Typography>
            </Stack>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              <Typography variant="h6" component="div" gutterBottom>
                Connection Error
              </Typography>
              <Typography>{error}</Typography>
              <Typography variant="body2" color="text.secondary">
                Make sure the backend server is running on port 4000
              </Typography>
            </Alert>
          )}
          
          {activeTab === 'overview' && healthStatus && (
            <Stack spacing={4}>
              <Chip label="✅ Backend Status" color="success" size="small" />
              
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h5" fontWeight="bold">
                      Available Features
                    </Typography>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Staked ETH Analytics Dashboard</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>EigenPod Monitoring Dashboard</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Strategy Analytics Dashboard</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Deposits Analytics Dashboard</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Withdrawals Analytics Dashboard</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Real-time Staking Data</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Block-level Analysis</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="✅" color="success" size="small" />
                        <Typography>Historical Data Queries</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}
          
          {activeTab === 'analytics' && <StakedEthDashboard />}
          {activeTab === 'eigenpods' && <EigenPodDashboard />}
          {activeTab === 'strategies' && <StrategyDashboard />}
          {activeTab === 'deposits' && <DepositsDashboard />}
          {activeTab === 'withdrawals' && <WithdrawalsDashboard />}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
