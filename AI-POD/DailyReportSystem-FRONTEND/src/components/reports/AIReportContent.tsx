'use client';

import { Paper, Stack, Typography, Divider, Box, Tooltip, IconButton, Chip } from '@mui/material';
import {
  CheckCircleOutlined,
  ScheduleOutlined,
  ErrorOutlineOutlined,
  LinkOutlined,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { BulletList } from '@/components/reports/BulletList';
import ReactMarkdown from 'react-markdown';

interface Blocker {
  title: string;
  description: string;
}

interface AIReportContentProps {
  reportId: string;
  reportTitle: string;
  generatedText: string;
  reportStatus: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'success';
    case 'draft':
      return 'default';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

export function AIReportContent({
  reportId,
  reportStatus,
  generatedText,
}: AIReportContentProps) {
  const t = useTranslations('report.reportsDetails');
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <Paper elevation={0}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        px={3}
        py={2}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.3px' }}>
            {t('reportTitles.daily')}
          </Typography>
          <Chip
            label={t('status.submitted')}
            size="small"
            color={getStatusColor(reportStatus) as any}
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: 11, borderRadius: 1.5, height: 20 }}
          />
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
            {reportId}
          </Typography>
        </Stack>

        {/* Copy link */}
        <Tooltip title={t('actions.copyLink')}>
          <IconButton
            size="small"
            onClick={handleCopyLink}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            <LinkOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Generated Text  */}
        <Box
          sx={{
            px: 3,
            bgcolor: 'background.paper',
            '& h1': {
              fontSize: '2rem',
              fontWeight: 700,
              mb: 2,
              mt: 3,
            },
            '& h2': {
              fontSize: '1.5rem',
              fontWeight: 700,
              mb: 1.5,
              mt: 3,
            },
            '& h3': {
              fontSize: '1.2rem',
              fontWeight: 600,
              mb: 1,
              mt: 2,
            },
            '& p': {
              color: 'text.secondary',
              lineHeight: 1.8,
              mb: 2,
            },
            '& ul, & ol': {
              pl: 3,
              mb: 2,
            },
            '& li': {
              mb: 1,
              color: 'text.secondary',
            },
            '& strong': {
              color: 'text.primary',
              fontWeight: 700,
            },
            '& code': {
              bgcolor: 'grey.100',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              fontSize: '0.9em',
              fontFamily: 'monospace',
            },
            '& pre': {
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 2,
              overflowX: 'auto',
              mb: 2,
            },
          }}
        >
          <ReactMarkdown>{generatedText}</ReactMarkdown>
        </Box>
      </Box>
    </Paper>
  );
}