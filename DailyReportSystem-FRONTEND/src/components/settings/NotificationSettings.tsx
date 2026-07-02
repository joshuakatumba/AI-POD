'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Snackbar,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { authFetch } from '@/utils/apiClient';
import { useTranslations } from 'next-intl';

interface NotificationPreferences {
  email_notifications_enabled: boolean;
  daily_summary_enabled: boolean;
  marketing_emails_enabled: boolean;
}

export default function NotificationSettings() {
  const t = useTranslations('Settings.NotificationSettings');
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_notifications_enabled: true,
    daily_summary_enabled: true,
    marketing_emails_enabled: false,
  });
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const response = await authFetch('/api/auth/current-user-info/');
        if (response.ok) {
          const data = await response.json();
          if (data.notification_preferences) {
            setPrefs(data.notification_preferences);
          }
        }
      } catch (error) {
        console.error('Error fetching notification preferences', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = async (field: keyof NotificationPreferences) => {
    const newPrefs = { ...prefs, [field]: !prefs[field] };
    setPrefs(newPrefs); // Optimistic update

    try {
      const response = await authFetch('/api/auth/notification-preferences/', {
        method: 'PUT',
        body: JSON.stringify(newPrefs),
      });

      if (response.ok) {
        setSnackbarMessage(t('updateSuccess'));
        setSnackbarSeverity('success');
      } else {
        throw new Error(t('updateError'));
      }
    } catch (error) {
      setSnackbarMessage(t('updateError'));
      setSnackbarSeverity('error');
      // Revert optimistic update
      setPrefs({ ...prefs });
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
        <CircularProgress sx={{ color: '#10b981' }} />
      </Box>
    );
  }

    const cardSx = {
    p: { xs: 3, md: 4 },
    borderRadius: 2,
    bgcolor: 'background.paper',
    border: `1px solid ${theme.palette.divider}`,
  };
return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* Email Alerts Section */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            bgcolor: 'primary.main',
          }}>
            <NotificationsActiveOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              Email Alerts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose what you want to be notified about via email.
            </Typography>
          </Box>
        </Box>

        <List disablePadding>
          <ListItem disableGutters sx={{ py: 2 }}>
            <ListItemText 
              primary={<Typography fontWeight={600} fontSize="0.95rem">{t('enableEmail')}</Typography>}
              secondary={<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('enableEmailDesc')}</Typography>}
            />
            <ListItemSecondaryAction>
              <Switch 
                edge="end" 
                checked={prefs.email_notifications_enabled} 
                onChange={() => handleToggle('email_notifications_enabled')} 
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10b981' },
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
          <Divider sx={{ opacity: 0.5 }} />
          <ListItem disableGutters sx={{ py: 2 }}>
            <ListItemText 
              primary={<Typography fontWeight={600} fontSize="0.95rem">{t('dailySummaries')}</Typography>}
              secondary={<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('dailySummariesDesc')}</Typography>}
            />
            <ListItemSecondaryAction>
              <Switch 
                edge="end" 
                checked={prefs.daily_summary_enabled} 
                onChange={() => handleToggle('daily_summary_enabled')}
                disabled={!prefs.email_notifications_enabled}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10b981' },
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Box>

      {/* Marketing Section */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            bgcolor: 'primary.main',
          }}>
            <CampaignOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              Marketing & Promotions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updates, offers, and promotions.
            </Typography>
          </Box>
        </Box>

        <List disablePadding>
          <ListItem disableGutters sx={{ py: 2 }}>
            <ListItemText 
              primary={<Typography fontWeight={600} fontSize="0.95rem">{t('promotionalEmails')}</Typography>}
              secondary={<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('promotionalEmailsDesc')}</Typography>}
            />
            <ListItemSecondaryAction>
              <Switch 
                edge="end" 
                checked={prefs.marketing_emails_enabled} 
                onChange={() => handleToggle('marketing_emails_enabled')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#f43f5e' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f43f5e' },
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Box>

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </Box>
  );
}
