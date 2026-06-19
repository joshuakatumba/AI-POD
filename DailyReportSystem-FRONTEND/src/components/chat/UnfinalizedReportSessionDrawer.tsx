'use client';

import { Box, Drawer, Stack, Typography, IconButton, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/app/_providers/ToastProvider';
import { UnfinalizedReportSessionType } from '@/_types/reports';
import UnfinalizedReportSessionState from './UnfinalizedReportSessionState';
import UnfinalizedReportSessionCard from './UnfinalizedReportSessionCard';

interface ReportSessionDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function UnfinalizedReportSessionDrawer({
  open,
  onClose,
}: ReportSessionDrawerProps) {
  const t = useTranslations('report.unfinalizedReport');
  const router = useRouter();
  const pathname = usePathname();
  const showToast = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [sessions, setSessions] = useState<UnfinalizedReportSessionType[]>([]);
  const [showAll, setShowAll] = useState(false);

  const INITIAL_VISIBLE_COUNT = 7;
  const displayedSessions = showAll ? sessions : sessions.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMoreSessions = sessions.length > INITIAL_VISIBLE_COUNT;
  const remainingCount = sessions.length - INITIAL_VISIBLE_COUNT;

  useEffect(() => {
    if (!open) {
      setShowAll(false);
      return;
    }
    fetchUnfinalizedReports();
  }, [open]);

  const fetchUnfinalizedReports = async () => {
    try {
      setLoading(true);
      setError(false);

      await new Promise((resolve) => setTimeout(resolve, 800));

      setSessions([
        // Mock data for demonstration; replace with actual API response --- IGNORE ---

        // {
        //   id: '1',
        //   report_name: 'Infrastructure Audit Report',
        //   project_name: 'Internal Systems Upgrade',
        //   updated_at: '2026-06-02',
        // },
        // {
        //   id: '2',
        //   report_name: 'Security Assessment',
        //   project_name: 'Client Migration Project',
        //   updated_at: '2026-06-01',
        // },
        // {
        //   id: '3', 
        //   report_name: 'System Vulnerability Audit',
        //   project_name: 'Client Migration Project',
        //   updated_at: '2026-05-28',
        // },
        // {
        //   id: '4',
        //   report_name: 'Cloud Cost Optimization Strategy',
        //   project_name: 'Emason Logistics Core',
        //   updated_at: '2026-05-25',
        // },
      ]);
    } catch (err) {
      setError(true);
      showToast({
        severity: 'error',
        message: t('state.fetchError'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueSession = (sessionId: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const localeOrScope = segments[0] || '';

    router.push(`/${localeOrScope}/chat/${sessionId}`);
    onClose();
  };

  const renderContent = () => {
    if (loading) {
      return <UnfinalizedReportSessionState type="loading" loadingLabel={t('state.loading')} />;
    }

    if (error) {
      return (
        <UnfinalizedReportSessionState
          type="error"
          errorLabel={t('state.fetchError')}
          retryLabel={t('state.retry')}
          onRetry={fetchUnfinalizedReports}
        />
      );
    }

    if (!sessions.length) {
      return (
        <UnfinalizedReportSessionState
          type="empty"
          emptyTitle={t('state.noReport')}
          emptyDescription={t('state.reportsFinalized')}
        />
      );
    }

    return (
      <Stack
        spacing={1.5}
        sx={{
          p: 3,
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        {displayedSessions.map((session) => (
          <UnfinalizedReportSessionCard
            key={session.id}
            session={session}
            lastUpdatedLabel={t('lastUpdated')}
            onClick={handleContinueSession}
          />
        ))}
        
        {hasMoreSessions && (
          <Button
            variant="text"
            size="small"
            onClick={() => setShowAll((prev) => !prev)}
            sx={{
              mt: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              alignSelf: 'center',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            {showAll
              ? t('buttons.showLess')
              : t('buttons.showMore', { count: remainingCount })}
          </Button>
        )}
      </Stack>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460 },
          border: 'none',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Section */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
              {t('title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('subtitle')}
            </Typography>
          </Box>

          <IconButton 
            onClick={onClose} 
            size="small" 
            sx={{ 
              bgcolor: 'action.hover',
              transition: 'background-color 0.2s ease'
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {renderContent()}
      </Box>
    </Drawer>
  );
}