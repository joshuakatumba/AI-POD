'use client';

import { Box, Paper, Stack, Typography, alpha } from '@mui/material';
import {
  DescriptionOutlined as ReportIcon,
  ChevronRight as ArrowIcon,
} from '@mui/icons-material';
import { UnfinalizedReportSessionType } from '@/_types/reports';

interface UnfinalizedReportSessionCardProps {
  session: UnfinalizedReportSessionType;
  lastUpdatedLabel: string;
  onClick: (sessionId: string) => void;
}

export default function UnfinalizedReportSessionCard({
  session,
  lastUpdatedLabel,
  onClick,
}: UnfinalizedReportSessionCardProps) {
  
  const formatSessionDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Paper
      component="div"
      role="button"
      tabIndex={0}
      onClick={() => onClick(session.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(session.id);
        }
      }}
      elevation={0}
      sx={(theme) => ({
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: 'background.paper',

        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.primary.main, 0.04)
            : alpha(theme.palette.primary.main, 0.015),
          boxShadow: theme.palette.mode === 'dark'
            ? '0px 6px 20px rgba(0, 0, 0, 0.4)'
            : '0px 6px 20px rgba(0, 0, 0, 0.03)',

          '& .action-arrow': {
            transform: 'translateX(4px)',
            color: 'primary.main',
          },
        },
        
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        }
      })}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flex: 1, minWidth: 0 }}
        >
          {/* Avatar Icon Container */}
          <Box
            sx={(theme) => ({
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            })}
          >
            <ReportIcon
              fontSize="small"
              sx={{ color: 'primary.main' }}
            />
          </Box>

          {/* Text Descriptions Column */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body1"
              fontWeight={700}
              noWrap
              sx={{ lineHeight: 1.3, letterSpacing: '-0.005em' }}
            >
              {session.report_name}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ mt: 0.25 }}
            >
              {session.project_name}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mt: 0.75, opacity: 0.85 }}
            >
              {lastUpdatedLabel} {formatSessionDate(session.updated_at)}
            </Typography>
          </Box>
        </Stack>

        {/* Status Context Action Indicator */}
        <ArrowIcon
          className="action-arrow"
          sx={{
            color: 'text.disabled',
            transition: 'transform 0.2s ease, color 0.2s ease',
            flexShrink: 0,
          }}
        />
      </Stack>
    </Paper>
  );
}