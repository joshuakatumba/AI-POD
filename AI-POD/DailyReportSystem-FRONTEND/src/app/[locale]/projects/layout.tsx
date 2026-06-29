'use client';

import React from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Box } from '@mui/material';
import ProjectSidebar from '@/components/projects/projectSidebar';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell mode="chat">
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: `calc(100vh - 64px)`,
          overflow: 'hidden',
        }}
      >
        {/* SIDEBAR */}
        <Box
          sx={{
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
            height: '100%',
          }}
        >
          <ProjectSidebar />
        </Box>

        {/* MAIN CONTENT */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: 4,
            overflowY: 'auto',
            height: '100%',
          }}
        >
          {children}
        </Box>
      </Box>
    </DashboardShell>
  );
}