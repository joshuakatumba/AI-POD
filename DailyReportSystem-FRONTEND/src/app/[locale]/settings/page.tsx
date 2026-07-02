'use client';

import { useState } from 'react';
import { Box, Typography, useTheme, alpha, Avatar } from '@mui/material';
import ProfileSettings from '@/components/settings/ProfileSettings';
import PreferencesSettings from '@/components/settings/PreferencesSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import AISettings from '@/components/settings/AISettings';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import TuneIcon from '@mui/icons-material/Tune';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslations } from 'next-intl';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      style={{ flex: 1, overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ py: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const theme = useTheme();
  const [value, setValue] = useState(0);

  const tabs = [
    {
      label: t('tabs.profile'),
      desc: 'Manage your profile',
      icon: <PersonOutlineIcon />,
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    },
    {
      label: t('tabs.preferences'),
      desc: 'Appearance & language',
      icon: <TuneIcon />,
      gradient: 'linear-gradient(135deg, #f59e0b, #f97316)'
    },
    {
      label: t('tabs.notifications'),
      desc: 'Email & alerts',
      icon: <NotificationsNoneIcon />,
      gradient: 'linear-gradient(135deg, #10b981, #06b6d4)'
    },
    {
      label: t('tabs.organization'),
      desc: 'Team & members',
      icon: <GroupsOutlinedIcon />,
      gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)'
    },
    {
      label: t('tabs.ai_integrations'),
      desc: 'AI & services',
      icon: <AutoAwesomeIcon />,
      gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)'
    },
  ];

  return (
    <Box sx={{ maxWidth: 1300, margin: '0 auto', width: '100%', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #a78bfa, #818cf8, #6366f1)'
              : 'linear-gradient(135deg, #4f46e5, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5,
          }}
        >
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your workspace, manage your account, and configure integrations.
        </Typography>
      </Box>

      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 4,
        minHeight: 600,
      }}>
        {/* Left Side: Navigation */}
        <Box sx={{
          minWidth: { md: 260 },
          flexShrink: 0,
        }}>
          <Box sx={{
            position: 'sticky',
            top: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            p: 1.5,
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.5)
              : alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(12px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 30px rgba(0,0,0,0.3)'
              : '0 4px 30px rgba(0,0,0,0.06)',
          }}>
            {tabs.map((tab, index) => (
              <Box
                key={index}
                onClick={() => setValue(index)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(value === index ? {
                    bgcolor: theme.palette.mode === 'dark'
                      ? alpha('#6366f1', 0.15)
                      : alpha('#6366f1', 0.08),
                    boxShadow: theme.palette.mode === 'dark'
                      ? `inset 0 0 0 1px ${alpha('#6366f1', 0.3)}`
                      : `inset 0 0 0 1px ${alpha('#6366f1', 0.15)}`,
                  } : {
                    '&:hover': {
                      bgcolor: alpha(theme.palette.action.hover, 0.06),
                      transform: 'translateX(4px)',
                    },
                  }),
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background: value === index ? tab.gradient : alpha(theme.palette.text.secondary, 0.1),
                    transition: 'all 0.3s ease',
                    '& .MuiSvgIcon-root': {
                      fontSize: 18,
                      color: value === index ? '#fff' : theme.palette.text.secondary,
                      transition: 'color 0.3s ease',
                    },
                  }}
                >
                  {tab.icon}
                </Avatar>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={value === index ? 700 : 500}
                    sx={{
                      color: value === index ? theme.palette.text.primary : theme.palette.text.secondary,
                      transition: 'all 0.25s ease',
                      lineHeight: 1.3,
                    }}
                  >
                    {tab.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: alpha(theme.palette.text.secondary, 0.7),
                      fontSize: '0.7rem',
                    }}
                  >
                    {tab.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right Side: Tab Panels */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CustomTabPanel value={value} index={0}>
            <ProfileSettings />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            <PreferencesSettings />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            <NotificationSettings />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={3}>
            <OrganizationSettings />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={4}>
            <AISettings />
          </CustomTabPanel>
        </Box>
      </Box>
    </Box>
  );
}