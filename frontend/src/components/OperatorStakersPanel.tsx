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
import { queryOperatorStakers } from '../utils/graphql';

interface Staker {
  address: string;
  operatorCount: number;
  depositCount: number;
  withdrawalCount: number;
  delegationCount: number;
}

interface OperatorStakersPanelProps {
  open: boolean;
  onClose: () => void;
  operatorId: string;
  operatorAddress: string;
}

const OperatorStakersPanel: React.FC<OperatorStakersPanelProps> = ({
  open,
  onClose,
  operatorId,
  operatorAddress
}) => {
  const [stakers, setStakers] = useState<Staker[]>([]);
  const [stakerCount, setStakerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryOperatorStakers(operatorId);
      setStakers(result.stakers || []);
      setStakerCount(result.stakerCount || 0);
    } catch (err: any) {
      console.error('Error fetching operator stakers:', err);
      setError(err.message);
      setStakers([]);
      setStakerCount(0);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (open && operatorId) {
      fetchStakers();
    }
  }, [open, operatorId, fetchStakers]);

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
              Operator Stakers
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

          {!loading && !error && stakers.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No stakers found for this operator
              </Typography>
            </Paper>
          )}

          {!loading && !error && stakers.length > 0 && (
            <List>
              {stakers.map((staker, index) => (
                <ListItem
                  key={staker.address}
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
                      {formatAddress(staker.address)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => window.open(getEtherscanAddressUrl(staker.address), '_blank')}
                    >
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip
                      label={`${staker.operatorCount} Operator${staker.operatorCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${staker.depositCount} Deposit${staker.depositCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${staker.withdrawalCount} Withdrawal${staker.withdrawalCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                    <Chip
                      label={`${staker.delegationCount} Delegation${staker.delegationCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="info"
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
            {stakers.length} staker{stakers.length !== 1 ? 's' : ''} shown
            {stakerCount > 0 && stakers.length < stakerCount && (
              <span> (of {stakerCount} total)</span>
            )}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OperatorStakersPanel;
