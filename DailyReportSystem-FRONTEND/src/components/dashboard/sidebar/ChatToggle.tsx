'use client';

import { Button, Box, Tooltip, IconButton, alpha, Typography } from '@mui/material';
import { 
  AddCommentOutlined as NewChatIcon,
} from '@mui/icons-material';
import ChatIcon from '@mui/icons-material/Chat';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from "next-intl";
import { useState } from 'react';
import ReportSessionDrawer from '@/components/chat/ReportSessionDrawer';

interface CreateSessionProps {
  isCollapsed: boolean;
}

export default function CreateSessionButton({ isCollapsed }: CreateSessionProps) {
  const router = useRouter();
  const t = useTranslations('chat');
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCreateSession = () => {
    setIsDrawerOpen(true)
  };

  const closeSessionDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      px: isCollapsed ? 0 : 2,
      mt: 'auto',
      pt: 2,
    }}>
      {isCollapsed ? (
        <Tooltip title="New Session" placement="right" arrow>
          <IconButton
            onClick={handleCreateSession}
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'white',
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'scale(1.1) rotate(-5deg)',
                boxShadow: (theme) => `0 8px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              }
            }}
          >
            <ChatIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          fullWidth
          variant="contained"
          onClick={handleCreateSession}
          startIcon={<ChatIcon />}
          sx={{
            py: 1.5,
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 800,
            fontSize: '0.875rem',
            letterSpacing: '0.2px',
            bgcolor: 'primary.main',
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
            boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'translateY(-2px)',
              boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
            },
            '&:active': {
              transform: 'translateY(0)',
            }
          }}
        >
          {t('button')}
        </Button>
      )}

      {/* Report Session Drawer */}
      <ReportSessionDrawer
        open={isDrawerOpen}
        onClose={closeSessionDrawer}
      />
    </Box>
  );
}