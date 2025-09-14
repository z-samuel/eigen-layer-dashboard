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
import { queryAVSOperatorSets } from '../utils/graphql';

interface OperatorSet {
  id: string;
  operatorCount: number;
  strategyCount: number;
  slashingCount: number;
  lastUpdateBlockNumber: number;
  lastUpdateBlockTimestamp: number;
}

interface AVSOperatorSetsPanelProps {
  open: boolean;
  onClose: () => void;
  avsId: string;
  avsAddress: string;
}

const AVSOperatorSetsPanel: React.FC<AVSOperatorSetsPanelProps> = ({
  open,
  onClose,
  avsId,
  avsAddress
}) => {
  const [operatorSets, setOperatorSets] = useState<OperatorSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperatorSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryAVSOperatorSets(avsId);
      setOperatorSets(result.operatorSets || []);
    } catch (err: any) {
      console.error('Error fetching AVS operator sets:', err);
      setError(err.message);
      setOperatorSets([]);
    } finally {
      setLoading(false);
    }
  }, [avsId]);

  useEffect(() => {
    if (open && avsId) {
      fetchOperatorSets();
    }
  }, [open, avsId, fetchOperatorSets]);

  const formatOperatorSetId = (id: string) => {
    if (!id) return 'N/A';
    return `${id.slice(0, 10)}....`;
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
              AVS Operator Sets
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {avsAddress}
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

          {!loading && !error && operatorSets.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No operator sets found for this AVS
              </Typography>
            </Paper>
          )}

          {!loading && !error && operatorSets.length > 0 && (
            <List>
              {operatorSets.map((operatorSet, index) => (
                <ListItem
                  key={operatorSet.id}
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
                      {formatOperatorSetId(operatorSet.id)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => window.open(`https://etherscan.io/address/${operatorSet.id}`, '_blank')}
                    >
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip
                      label={`${operatorSet.operatorCount} Operator${operatorSet.operatorCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${operatorSet.strategyCount} Strateg${operatorSet.strategyCount !== 1 ? 'ies' : 'y'}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${operatorSet.slashingCount} Slashing${operatorSet.slashingCount !== 1 ? 's' : ''}`}
                      size="small"
                      color={operatorSet.slashingCount > 0 ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </Box>

                  <Box width="100%">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Last Updated: {formatDate(operatorSet.lastUpdateBlockTimestamp)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Block #{formatBlockNumber(operatorSet.lastUpdateBlockNumber)}
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
            {operatorSets.length} operator set{operatorSets.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AVSOperatorSetsPanel;
