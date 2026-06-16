'use client';

import { Paper, Stack, Typography, Box } from '@mui/material';
import { ArticleOutlined, FolderOutlined, GroupOutlined, CalendarToday } from '@mui/icons-material';
import { PersonOutline } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { ReportMeta } from '@/_types/reports';

interface ReportDetailsCardProps {
  report: ReportMeta;
}

export function ReportDetailsCard({ report }: ReportDetailsCardProps) {
  const t = useTranslations('report.reportsDetails');

  const rows = [
    { label: t('id'), value: report.id, icon: <ArticleOutlined sx={{ fontSize: 15 }} /> },
    { label: t('owner'), value: report.owner, icon: <PersonOutline sx={{ fontSize: 15 }} /> },
    { label: t('project'), value: report.project, icon: <FolderOutlined sx={{ fontSize: 15 }} /> },
    { label: t('organisation'), value: report.organisation, icon: <GroupOutlined sx={{ fontSize: 15 }} /> },
    { label: t('date'), value: report.date, icon: <CalendarToday sx={{ fontSize: 14 }} /> },
  ];

  return (
    <Paper elevation={0}>
      <Typography variant="subtitle2" fontWeight={800} mb={2} sx={{ letterSpacing: '-0.2px' }}>
        {t('title')}
      </Typography>
      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ color: 'text.disabled', display: 'flex' }}>{row.icon}</Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                {row.label}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.primary"
              sx={{ fontSize: 12 }}
            >
              {row.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}