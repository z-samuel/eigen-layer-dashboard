import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Paper
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { queryOperatorStrategies } from '../utils/graphql';

interface Strategy {
  id: string;
  avsCount: number;
  stakerCount: number;
}

interface OperatorStrategiesPanelProps {
  open: boolean;
  onClose: () => void;
  operatorId: string;
  operatorAddress: string;
}

const OperatorStrategiesPanel: React.FC<OperatorStrategiesPanelProps> = ({
  open,
  onClose,
  operatorId,
  operatorAddress
}) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryOperatorStrategies(operatorId);
      setStrategies(result.strategies || []);
    } catch (err: any) {
      console.error('Error fetching operator strategies:', err);
      setError(err.message);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (open && operatorId) {
      fetchStrategies();
    }
  }, [open, operatorId, fetchStrategies]);

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEtherscanAddressUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 400,
          maxWidth: '90vw',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" component="h2">
              Operator Strategies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatAddress(operatorAddress)}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && strategies.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No strategies found for this operator
              </Typography>
            </Paper>
          )}

          {!loading && !error && strategies.length > 0 && (
            <List>
              {strategies.map((strategy, index) => (
                <ListItem
                  key={strategy.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 2
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" mb={1}>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                      {formatAddress(strategy.id)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => window.open(getEtherscanAddressUrl(strategy.id), '_blank')}
                    >
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={`${strategy.avsCount} AVS${strategy.avsCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${strategy.stakerCount} Staker${strategy.stakerCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {strategies.length} strateg{strategies.length !== 1 ? 'ies' : 'y'} found
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OperatorStrategiesPanel;
