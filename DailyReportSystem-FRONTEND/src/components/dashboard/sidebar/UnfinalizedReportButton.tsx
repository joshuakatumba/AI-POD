'use client';

import { Button, Box, Tooltip, IconButton, alpha } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useTranslations } from "next-intl";
import { useState } from 'react';
import UnfinalizedReportSessionDrawer from '@/components/chat/UnfinalizedReportSessionDrawer';

interface CreateSessionProps {
  isCollapsed: boolean;
}

export default function UnfinalizedReportButton({ isCollapsed }: CreateSessionProps) {
  const t = useTranslations('report.unfinalizedReport');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCreateSession = () => {
    setIsDrawerOpen(true);
  };

  const closeSessionDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <Box 
      sx={{
        display: 'flex',
        justifyContent: 'center',
        px: isCollapsed ? 0 : 2,
        mt: 'auto',
        pt: 2,
        pb: 2,
      }}
    >
      {isCollapsed ? (
        <Tooltip title={t('title')} placement="right" arrow>
          <IconButton
            onClick={handleCreateSession}
            sx={(theme) => ({
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.primary.main, 0.1) 
                : 'action.hover',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                transform: 'translateY(-1px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            })}
          >
            <PendingActionsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          fullWidth
          variant="outlined"
          onClick={handleCreateSession}
          startIcon={<PendingActionsIcon />}
          sx={(theme) => ({
            py: 1.25,
            px: 2,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '-0.01em',
            color: 'text.primary',
            borderColor: 'divider',
            bgcolor: 'transparent',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.02)}`,
            },
            '&:active': {
              transform: 'translateY(0)',
            }
          })}
        >
          {t('title')}
        </Button>
      )}

      {/* Unfinalized Report Session Drawer */}
      <UnfinalizedReportSessionDrawer
        open={isDrawerOpen}
        onClose={closeSessionDrawer}
      />
    </Box>
  );
}