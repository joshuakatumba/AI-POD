'use client';

import { useEffect, useState } from 'react';
import { Paper, Stack, Avatar, Typography, Box, useTheme, CircularProgress } from '@mui/material';
import { Assessment as AssessmentIcon } from '@mui/icons-material';
import { PieChart } from '@mui/x-charts/PieChart';
import { useTranslations } from 'next-intl';
import { getProjectTasksAPI } from '@/app/[locale]/projects/[project_id]/tasks/index';
import { TaskType } from '@/_types/task';
import { ProjectResponseType } from '@/_types/project';

interface TaskProgressChartProps {
  project: ProjectResponseType;
}

export default function TaskProgressChart({ project }: TaskProgressChartProps) {
  const t = useTranslations('projects');
  const theme = useTheme();
 
  const [error, setError] = useState<string | null>(null);

  if (!project?.progress_data) return null;

  const { progress_data } = project;

  const total = Object.values(progress_data).reduce((sum, val) => sum + (val ?? 0), 0);
  const completed = (progress_data.done ?? 0) + (progress_data.deployed ?? 0) + (progress_data.closed ?? 0);
  const completedPercentage = total > 0 ? (completed / total) * 100 : 0;

  const chartData = [
    {
      id: 0,
      value: (progress_data.done ?? 0) + (progress_data.deployed ?? 0) + (progress_data.ready ?? 0) ,
      label: t('details.pieChart.legend.completed'),
      color: theme.palette.success.main,
    },
    {
      id: 1,
      value: (progress_data.in_progress ?? 0) + (progress_data.review ?? 0) + (progress_data.testing ?? 0),
      label: t('details.pieChart.legend.active'),
      color: theme.palette.warning.main,
    },
    {
      id: 2,
      value: (progress_data.backlog ?? 0) + (progress_data.todo ?? 0),
      label: t('details.pieChart.legend.upcoming'),
      color: theme.palette.grey[400],
    },
    {
      id: 3,
      value: progress_data.blocked ?? 0,
      label: t('details.pieChart.legend.blocked'),
      color: theme.palette.error.main,
    },
    {
      id: 4,
      value: (progress_data.cancelled ?? 0) + (progress_data.closed ?? 0),
      label: t('details.pieChart.legend.cancelled'),
      color: theme.palette.error.light,
    },
  ].filter((item) => item.value > 0); 

  /* -------- Error State -------- */
  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  /* -------- Empty State -------- */
  if (total === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          width: '100%',
          maxWidth: 400,
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: 'white',
              color: 'primary.main',
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'primary.light',
            }}
          >
            <AssessmentIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {t('details.pieChart.title')}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {t('details.pieChart.subTitle')}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            {t('details.pieChart.emptyState')}
          </Typography>
        </Box>
      </Paper>
    );
  }

  /* -------- Main UI -------- */
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'white',
            color: 'primary.main',
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'primary.light',
          }}
        >
          <AssessmentIcon/>
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.2px', lineHeight: 1.2 }}>
            {t('details.pieChart.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t('details.pieChart.subTitle')}
          </Typography>
        </Box>
      </Stack>

      {/* Donut Chart Container */}
      <Box sx={{ position: 'relative', height: 200, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <PieChart
          series={[
            {
              data: chartData,
              innerRadius: 60,
              outerRadius: 90,
              paddingAngle: 5, 
              cornerRadius: 6, 
              startAngle: -90,
              endAngle: 270,
              cx: '50%',
              cy: '50%',
            },
          ]}
          width={200}
          height={200}
          hideLegend
        />
        
        <Box
          sx={{
            position: 'absolute',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="h4" fontWeight={900} color="text.primary" sx={{ lineHeight: 1 }}>
            {Math.round(completedPercentage)}%
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1.5} sx={{ mt: 4 }}>
        {chartData.map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                {item.label}
              </Typography>
            </Stack>
            <Typography variant="body2" fontWeight={800} color="text.primary">
              {item.value}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {/* Footer Total Weight */}
      <Box sx={{ mt: 'auto', pt: 3 }}>
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center"
          sx={{ 
            p: 2, 
            borderRadius: 3, 
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ textTransform: 'uppercase' }}>
            {t('details.stats.total')}
          </Typography>
          <Typography variant="subtitle2" fontWeight={900} color="primary.main">
            {total} {t('details.pieChart.tasks')}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}