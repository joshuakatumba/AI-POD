'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { authFetch } from '@/utils/apiClient';
import { useTranslations } from 'next-intl';

interface Membership {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  role: string;
  display_name: string;
  is_active: boolean;
}

export default function OrganizationSettings() {
  const t = useTranslations('Settings.OrganizationSettings');
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Invite Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Snackbar State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchMembers = async (organizationId: string) => {
    try {
      const response = await authFetch(`/organizations/${organizationId}/members/`);
      if (response.ok) {
        const data = await response.json();
        setMemberships(data);
      }
    } catch (error) {
      console.error('Failed to fetch members', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const userResp = await authFetch('/api/auth/current-user-info/');
        if (userResp.ok) {
          const userData = await userResp.json();
          // Find active org (first one for now, or you could add last_accessed_at logic)
          if (userData.memberships && userData.memberships.length > 0) {
            const activeOrgId = userData.memberships[0].organization_id;
            setOrgId(activeOrgId);
            await fetchMembers(activeOrgId);
          }
        }
      } catch (error) {
        console.error('Initialization error', error);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const showSnackbar = (msg: string, severity: 'success' | 'error') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleInvite = async () => {
    if (!orgId || !inviteEmail) return;
    setInviteLoading(true);

    try {
      const response = await authFetch(`/organizations/${orgId}/members/`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        showSnackbar(t('inviteSuccess'), 'success');
        setInviteOpen(false);
        setInviteEmail('');
        fetchMembers(orgId);
      } else {
        const err = await response.json();
        showSnackbar(err.detail || t('inviteError'), 'error');
      }
    } catch (error) {
      showSnackbar(t('inviteError'), 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!orgId) return;
    if (!confirm(t('confirmRemove'))) return;

    try {
      const response = await authFetch(`/organizations/${orgId}/members/${membershipId}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar(t('removeSuccess'), 'success');
        fetchMembers(orgId);
      } else {
        showSnackbar(t('removeError'), 'error');
      }
    } catch (error) {
      showSnackbar(t('removeError'), 'error');
    }
  };

  const handleChangeRole = async (membershipId: string, newRole: string) => {
    if (!orgId) return;

    try {
      const response = await authFetch(`/organizations/${orgId}/members/${membershipId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        showSnackbar(t('roleSuccess'), 'success');
        fetchMembers(orgId);
      } else {
        showSnackbar(t('roleError'), 'error');
      }
    } catch (error) {
      showSnackbar(t('roleError'), 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (!orgId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">{t('notInOrg')}</Alert>
      </Box>
    );
  }

  const cardSx = {
    p: { xs: 3, md: 4 },
    borderRadius: 4,
    bgcolor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.6) 
      : theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    backdropFilter: 'blur(12px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.3)'
      : '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
    '&:hover': {
      borderColor: alpha(theme.palette.divider, 0.15),
      boxShadow: theme.palette.mode === 'dark'
        ? '0 8px 40px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)',
    },
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: `0 0 0 3px ${alpha('#3b82f6', 0.06)}`,
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha('#3b82f6', 0.12)}`,
      },
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              width: 48, height: 48, 
              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            }}>
              <PeopleOutlineIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                Team Members
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your organization's members and their roles.
              </Typography>
            </Box>
          </Box>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setInviteOpen(true)}
            sx={{ 
              borderRadius: 2.5,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
              transition: 'all 0.25s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                boxShadow: '0 6px 20px rgba(59,130,246,0.45)',
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0)' },
            }}
          >
            Invite Member
          </Button>
        </Box>

        <TableContainer sx={{ background: 'transparent' }}>
          <Table sx={{ minWidth: 650 }} aria-label="team members table">
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` } }}>
                <TableCell><Typography fontWeight={600} color="text.secondary" fontSize="0.85rem" textTransform="uppercase">{t('name')}</Typography></TableCell>
                <TableCell><Typography fontWeight={600} color="text.secondary" fontSize="0.85rem" textTransform="uppercase">{t('email')}</Typography></TableCell>
                <TableCell><Typography fontWeight={600} color="text.secondary" fontSize="0.85rem" textTransform="uppercase">{t('role')}</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight={600} color="text.secondary" fontSize="0.85rem" textTransform="uppercase">{t('actions')}</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberships.map((membership) => (
                <TableRow key={membership.id} hover sx={{ '& td': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` } }}>
                  <TableCell>
                    <Typography fontWeight={500}>
                      {membership.display_name || membership.user.full_name || 'No Name'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {membership.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={membership.role}
                      size="small"
                      onChange={(e) => handleChangeRole(membership.id, e.target.value)}
                      sx={{ 
                        minWidth: 120, 
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.divider, 0.1),
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.divider, 0.2),
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        }
                      }}
                    >
                      <MenuItem value="admin">{t('roleAdmin')}</MenuItem>
                      <MenuItem value="user">{t('roleUser')}</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="error" 
                      onClick={() => handleRemoveMember(membership.id)}
                      title="Remove Member"
                      sx={{ 
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {memberships.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                    <Typography color="text.secondary">{t('noMembers')}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Invite Modal */}
      <Dialog 
        open={inviteOpen} 
        onClose={() => setInviteOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 3, px: 3, fontWeight: 700 }}>{t('inviteNewMember')}</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the email address of the person you'd like to invite to the organization.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t('emailAddress')}
            type="email"
            fullWidth
            variant="outlined"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
          />
          <TextField
            select
            label={t('role')}
            fullWidth
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            sx={textFieldSx}
          >
            <MenuItem value="admin">{t('roleAdmin')}</MenuItem>
            <MenuItem value="user">{t('roleUser')}</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setInviteOpen(false)} 
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleInvite} 
            variant="contained" 
            disabled={!inviteEmail || inviteLoading}
            sx={{ 
              borderRadius: 2, 
              px: 3, 
              textTransform: 'none', 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            }}
          >
            {inviteLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
