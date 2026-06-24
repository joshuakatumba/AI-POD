'use client';

import { Drawer, Box, Divider, styled, alpha, IconButton, Stack, Typography, Button, Avatar } from '@mui/material';
import { AdminPanelSettings, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import OrganisationSwitcher from '@/components/dashboard/sidebar/OrganisationSwitcher';
import NavItems from '@/components/dashboard/sidebar/NavItems';
import UserSection from '@/components/dashboard/sidebar/UserSection';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '@/app/_contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { getSidebarCollapseFromCookie, setSidebarCollapseCookie } from '@/utils/sidebarPreference';
import AdminToggle from './AdminToggle';
import ChatToggle from '@/components/dashboard/sidebar/ChatToggle';
import { ProjectMemberType } from '@/_types/projectMembers';
import { organisationMemberResponseType, organisationMemberType } from '@/_types/organisation';
import { OrganisationMembership } from '@/_types/auth';
import { useTranslations } from 'next-intl';
import UnfinalizedReportButton from '@/components/dashboard/sidebar/UnfinalizedReportButton';

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 88;

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })<{ open: boolean }>(
  ({ theme, open }) => ({
    width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
      boxSizing: 'border-box',
      borderRight: `1px solid ${theme.palette.divider}`,
      background: theme.palette.mode === 'light'
        ? '#ffffff'
        : alpha(theme.palette.background.default, 0.8),
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.standard,
      }),
    },
  })
);

const NavContainer = styled(Box)({
  flexGrow: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingTop: '8px',
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-thumb': { backgroundColor: 'transparent', borderRadius: '10px' },
  '&:hover::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)' },
});

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const t = useTranslations('dashboard.switcher'); 
  const [isCollapsed, setIsCollapsed] = useState(() => getSidebarCollapseFromCookie() ?? false);
  const { user, memberships } = useAuth()
  const pathname = usePathname();

  useEffect(() => {
    setSidebarCollapseCookie(isCollapsed);
  }, [isCollapsed]);
  const isAdminMode = pathname.split('/').includes('admin');
  const isAdmin = user?.super_admin || user?.is_staff;
  const currentUserMembership = memberships?.find(
    (membership: OrganisationMembership) => membership.is_current);
  const userCanChat = !isAdminMode && !!currentUserMembership;

  const drawerContent = (
    <>
      {/* --- Sidebar Header Area --- */}
      <Box
        sx={{
          height: 64, // Matches AppBar height for a clean horizontal line
          display: 'flex',
          alignItems: 'center',
          px: isCollapsed ? 0 : 2.5,
          justifyContent: isCollapsed ? 'center' : 'space-between',
          overflow: 'hidden'
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{
            minWidth: 0,
            display: isCollapsed ? 'none' : 'flex' // Hide brand info entirely when collapsed
          }}
        >
          {/* Logo Container */}
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}
          >
            {/* <LogoIcon sx={{ fontSize: 20 }} /> */}
          </Box>

          {/* App Name */}
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              letterSpacing: '-0.02em',
              color: 'text.primary',
              whiteSpace: 'nowrap'
            }}
          >
            AI-POD
          </Typography>
        </Stack>

        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          size="small"
          sx={{
            display: { xs: 'none', md: 'inline-flex' }, // Hide collapse toggle on mobile
            bgcolor: isCollapsed ? 'transparent' : alpha('#000', 0.02),
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08)
            }
          }}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>

      <Box sx={{ p: 0.5 }}>
        {isAdminMode ? (
          <Box sx={{ p: isCollapsed ? 0.5 : 1 }}>
            <Box
              sx={{
                height: 48,
                display: 'flex',
                alignItems: 'center',
                px: isCollapsed ? 0 : 2,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                bgcolor: 'action.hover',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Avatar variant="rounded" sx={{ width: 24, height: 24, fontSize: 12 }}><AdminPanelSettings /></Avatar>
              {!isCollapsed && (
                <Typography variant="subtitle2" sx={{ ml: 1.5, fontWeight: 700, p: isCollapsed ? 0.5 : 1, }}>
                  {t('systemAdmin')}
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <OrganisationSwitcher isCollapsed={isCollapsed} />
        )}
      </Box>

      {isAdmin && (
        <Box>
          <AdminToggle isAdminMode={isAdminMode} isCollapsed={isCollapsed} />
        </Box>
      )}

      <Divider sx={{ mx: isCollapsed ? 1 : 2, my: 1, opacity: 0.6 }} />

      <NavContainer>
        <NavItems isCollapsed={isCollapsed} isAdminMode={isAdminMode} onMobileClose={onMobileClose} />
      </NavContainer>

      <Box sx={{ mb: 0 }}>
        <UnfinalizedReportButton isCollapsed={isCollapsed} />
      </Box>

      {!isAdminMode && (
        <Box sx={{ mt: 'auto' }}>
          <ChatToggle isCollapsed={isCollapsed} />
        </Box>
      )}

      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ mx: isCollapsed ? 1 : 2, my: 1, opacity: 0.6 }} />
        <UserSection isCollapsed={isCollapsed} />
      </Box>
    </>
  );

  return (
    <Box component="nav" sx={{ width: { md: isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH,
            background: (theme) => theme.palette.mode === 'light' ? '#ffffff' : alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        {/* We force isCollapsed to false for the mobile drawer's copy of drawerContent */}
        <MobileContentOverride setCollapsed={setIsCollapsed}>
          {drawerContent}
        </MobileContentOverride>
      </Drawer>
      
      {/* Desktop Drawer */}
      <StyledDrawer variant="permanent" open={!isCollapsed} sx={{ display: { xs: 'none', md: 'block' } }}>
        {drawerContent}
      </StyledDrawer>
    </Box>
  );
}

// Helper component to force isCollapsed=false while rendering inside the mobile drawer
function MobileContentOverride({ children, setCollapsed }: { children: React.ReactNode, setCollapsed: any }) {
  useEffect(() => {
    // Ensuring that if someone opens mobile drawer, it doesn't stay collapsed.
    setCollapsed(false);
  }, [setCollapsed]);
  return <>{children}</>;
}