'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
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
  TextField,
  MenuItem,
  Button,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import { useTranslations } from 'next-intl';

interface AIPrefs {
  provider: string;
  apiKey: string;
  slackWebhook: string;
  githubIntegration: boolean;
}

export default function AISettings() {
  const t = useTranslations('Settings.AISettings');
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<AIPrefs>({
    provider: 'openai',
    apiKey: '',
    slackWebhook: '',
    githubIntegration: false,
  });
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    // Load from local storage for now since backend integration is pending
    const saved = localStorage.getItem('ai_integration_prefs');
    if (saved) {
      try {
        setPrefs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse local preferences', e);
      }
    }
    setLoading(false);
  }, []);

  const handleChange = (field: keyof AIPrefs, value: string | boolean) => {
    setPrefs({ ...prefs, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      localStorage.setItem('ai_integration_prefs', JSON.stringify(prefs));
      setSnackbarMessage(t('updateSuccess'));
      setSnackbarSeverity('success');
    } catch (error) {
      setSnackbarMessage(t('updateError'));
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
        <CircularProgress sx={{ color: '#8b5cf6' }} />
      </Box>
    );
  }

    const cardSx = {
    p: { xs: 3, md: 4 },
    borderRadius: 2,
    bgcolor: 'background.paper',
    border: `1px solid ${theme.palette.divider}`,
  };
const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      transition: 'all 0.2s ease',
      '&:hover': {
      },
      '&.Mui-focused': {
      },
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* AI Provider Section */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            bgcolor: 'primary.main',
          }}>
            <SmartToyOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {t('aiConfiguration')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('aiConfigurationDesc')}
            </Typography>
          </Box>
        </Box>

        <TextField
          select
          fullWidth
          label={t('providerLabel')}
          value={prefs.provider}
          onChange={(e) => handleChange('provider', e.target.value)}
          sx={{ mb: 3, ...textFieldSx }}
        >
          <MenuItem value="openai">OpenAI (GPT-4)</MenuItem>
          <MenuItem value="gemini">Google Gemini</MenuItem>
          <MenuItem value="anthropic">Anthropic Claude</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label={t('apiKeyLabel')}
          type="password"
          value={prefs.apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          placeholder="sk-..."
          helperText={t('apiKeyHelper')}
          sx={{ mb: 2, ...textFieldSx }}
        />
      </Box>

      {/* Integrations Section */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            bgcolor: 'primary.main',
          }}>
            <ExtensionOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {t('integrations')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('integrationsDesc')}
            </Typography>
          </Box>
        </Box>

        <List disablePadding>
          <ListItem disableGutters sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
            <ListItemText 
              primary={<Typography fontWeight={600} fontSize="0.95rem">{t('slackIntegration')}</Typography>}
              secondary={<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('slackIntegrationDesc')}</Typography>}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Webhook URL"
              value={prefs.slackWebhook}
              onChange={(e) => handleChange('slackWebhook', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              sx={textFieldSx}
            />
          </ListItem>

          <Divider sx={{ my: 3, opacity: 0.5 }} />

          <ListItem disableGutters>
            <ListItemText 
              primary={<Typography fontWeight={600} fontSize="0.95rem">{t('githubIntegration')}</Typography>}
              secondary={<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('githubIntegrationDesc')}</Typography>}
            />
            <ListItemSecondaryAction>
              <Switch 
                edge="end" 
                checked={prefs.githubIntegration} 
                onChange={(e) => handleChange('githubIntegration', e.target.checked)} 
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#0ea5e9' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#0ea5e9' },
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          disabled={saving}
          sx={{ 
            borderRadius: 2.5,
            px: 4,
            py: 1.2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            bgcolor: 'primary.main',
            transition: 'all 0.25s ease',
            '&:hover': {
              bgcolor: 'primary.main',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
          }}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : t('saveChanges')}
        </Button>
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
