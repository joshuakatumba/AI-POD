'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Box, Drawer, IconButton, Fab } from '@mui/material';
import ProjectSidebar from '@/components/projects/projectSidebar';
import { Menu as MenuIcon } from '@mui/icons-material';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <DashboardShell mode="chat">
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: `calc(100vh - 64px)`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* DESKTOP SIDEBAR */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
            height: '100%',
            width: 320,
          }}
        >
          <ProjectSidebar />
        </Box>

        {/* MOBILE SIDEBAR DRAWER */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 320 },
          }}
        >
          <ProjectSidebar onMobileClose={handleDrawerToggle} />
        </Drawer>

        {/* MAIN CONTENT */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, md: 4 },
            overflowY: 'auto',
            height: '100%',
            position: 'relative',
          }}
        >
          <Fab
            color="primary"
            size="medium"
            onClick={handleDrawerToggle}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              display: { xs: 'flex', md: 'none' },
              zIndex: 1000,
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            }}
          >
            <MenuIcon />
          </Fab>
          {children}
        </Box>
      </Box>
    </DashboardShell>
  );
}