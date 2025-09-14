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
import { queryOperatorAVSs } from '../utils/graphql';

interface AVS {
  id: string;
  owner: string;
  operatorCount: number;
  operatorSetCount: number;
  strategyCount: number;
  slashingCount: number;
  lastUpdateBlockNumber: number;
  lastUpdateBlockTimestamp: number;
}

interface OperatorAVSsPanelProps {
  open: boolean;
  onClose: () => void;
  operatorId: string;
  operatorAddress: string;
}

const OperatorAVSsPanel: React.FC<OperatorAVSsPanelProps> = ({
  open,
  onClose,
  operatorId,
  operatorAddress
}) => {
  const [avss, setAvss] = useState<AVS[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAVSs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryOperatorAVSs(operatorId);
      setAvss(result.avss || []);
    } catch (err: any) {
      console.error('Error fetching operator AVSs:', err);
      setError(err.message);
      setAvss([]);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (open && operatorId) {
      fetchAVSs();
    }
  }, [open, operatorId, fetchAVSs]);

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEtherscanAddressUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
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

  const formatBlockNumber = (blockNumber: number) => {
    if (!blockNumber) return 'N/A';
    return blockNumber.toLocaleString();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 450,
          maxWidth: '90vw',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" component="h2">
              Operator AVSs
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

          {!loading && !error && avss.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No AVSs found for this operator
              </Typography>
            </Paper>
          )}

          {!loading && !error && avss.length > 0 && (
            <List>
              {avss.map((avs, index) => (
                <ListItem
                  key={avs.id}
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
                      {formatAddress(avs.id)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => window.open(getEtherscanAddressUrl(avs.id), '_blank')}
                    >
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip
                      label={`${avs.operatorCount} Operator${avs.operatorCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${avs.strategyCount} Strateg${avs.strategyCount !== 1 ? 'ies' : 'y'}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${avs.slashingCount} Slashing${avs.slashingCount !== 1 ? 's' : ''}`}
                      size="small"
                      color={avs.slashingCount > 0 ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </Box>

                  <Box width="100%">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Owner: {formatAddress(avs.owner)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Last Updated: {formatDate(avs.lastUpdateBlockTimestamp)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Block #{formatBlockNumber(avs.lastUpdateBlockNumber)}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {avss.length} AVS{avss.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OperatorAVSsPanel;
