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
import { queryOperatorSetOperators } from '../utils/graphql';

interface Operator {
  id: string;
  avsCount: number;
  strategyCount: number;
  stakerCount: number;
  lastUpdateBlockNumber: number;
  lastUpdateBlockTimestamp: number;
}

interface OperatorSetOperatorsPanelProps {
  open: boolean;
  onClose: () => void;
  operatorSetId: string;
  operatorSetAddress: string;
}

const OperatorSetOperatorsPanel: React.FC<OperatorSetOperatorsPanelProps> = ({
  open,
  onClose,
  operatorSetId,
  operatorSetAddress
}) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryOperatorSetOperators(operatorSetId);
      setOperators(result.operators || []);
    } catch (err: any) {
      console.error('Error fetching operator set operators:', err);
      setError(err.message);
      setOperators([]);
    } finally {
      setLoading(false);
    }
  }, [operatorSetId]);

  useEffect(() => {
    if (open && operatorSetId) {
      fetchOperators();
    }
  }, [open, operatorSetId, fetchOperators]);

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
              Operator Set Operators
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {operatorSetAddress}
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

          {!loading && !error && operators.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No operators found for this operator set
              </Typography>
            </Paper>
          )}

          {!loading && !error && operators.length > 0 && (
            <List>
              {operators.map((operator, index) => (
                <ListItem
                  key={operator.id}
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
                      {formatAddress(operator.id)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => window.open(getEtherscanAddressUrl(operator.id), '_blank')}
                    >
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip
                      label={`${operator.avsCount} AVS${operator.avsCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${operator.strategyCount} Strateg${operator.strategyCount !== 1 ? 'ies' : 'y'}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${operator.stakerCount} Staker${operator.stakerCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Box>

                  <Box width="100%">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Last Updated: {formatDate(operator.lastUpdateBlockTimestamp)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Block #{formatBlockNumber(operator.lastUpdateBlockNumber)}
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
            {operators.length} operator{operators.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OperatorSetOperatorsPanel;
