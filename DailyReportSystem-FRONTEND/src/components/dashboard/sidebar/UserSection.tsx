'use client';

import { Box, Avatar, Typography, IconButton, Stack, Tooltip, alpha, styled, Skeleton } from '@mui/material';
import { LogoutOutlined as LogoutIcon } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/_contexts/AuthContext';
import { useMemo, useState } from 'react';
import ProfileDetailsDrawer from '@/components/profile/ProfileDetailsDrawer';

const UserProfileCard = styled(Box, { shouldForwardProp: (prop) => prop !== 'collapsed' })<{ collapsed: boolean }>(
  ({ theme, collapsed }) => ({
    padding: collapsed ? theme.spacing(1) : theme.spacing(1.5),
    margin: theme.spacing(1),
    borderRadius: theme.spacing(2),
    backgroundColor: alpha(theme.palette.action.active, 0.04),
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    justifyContent: collapsed ? 'center' : 'flex-start',
    '&:hover': { backgroundColor: alpha(theme.palette.action.active, 0.08) },
  })
);

export default function UserSection({ isCollapsed }: { isCollapsed: boolean }) {
  const { logout, user, memberships } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleOpenUserProfile = () => {setDrawerOpen(true); };
     
  const displayName = useMemo(() => {
    if (!user?.memberships) return user?.email?.split('@')[0] || 'User';
    const current = memberships.find((m: any) => m.is_current);
    return current?.display_name || current?.organization_name || user.email;
  }, [user]);

  if (!user) return <Box sx={{ p: 4 }}><Skeleton variant="circular" width={36} height={36} /></Box>;

  const content = (
    <Stack direction="row" spacing={isCollapsed ? 0 : 1.5} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
      <Avatar sx={{ width: 36, height: 36, fontSize: '0.875rem', fontWeight: 700, bgcolor: 'primary.main' }}>
        {displayName.charAt(0).toUpperCase()}
      </Avatar>

      {!isCollapsed && (
        <>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.2 }}>{displayName}</Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>{user.email}</Typography>
          </Box>
          <IconButton onClick={(e) =>{ e.stopPropagation();logout()}} size="small" sx={{ '&:hover': { color: 'error.main' } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Stack>
  );

  return (
    <><UserProfileCard collapsed={isCollapsed} onClick={handleOpenUserProfile} sx={{ cursor: 'pointer' }}>
      {isCollapsed ? <Tooltip title={displayName} placement="right">{content}</Tooltip> : content}
    </UserProfileCard>
    <ProfileDetailsDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)} />
   </>
  );
}