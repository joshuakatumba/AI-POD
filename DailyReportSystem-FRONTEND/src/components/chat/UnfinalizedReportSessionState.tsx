'use client';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  alpha,
} from '@mui/material';

import {
  DescriptionOutlined as ReportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface UnfinalizedReportSessionStateProps {
  type: 'loading' | 'error' | 'empty';
  loadingLabel?: string;
  errorLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export default function UnfinalizedReportSessionState({
  type,
  loadingLabel,
  errorLabel,
  emptyTitle,
  emptyDescription,
  retryLabel,
  onRetry,
}: UnfinalizedReportSessionStateProps) {
  
  const containerStyles = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 280,
  };

  if (type === 'loading') {
    return (
      <Box sx={{ ...containerStyles, gap: 2 }}>
        <CircularProgress
          size={32}
          thickness={4.5}
          sx={{ color: 'primary.main' }}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {loadingLabel}
        </Typography>
      </Box>
    );
  }

  if (type === 'error') {
    return (
      <Box sx={{ ...containerStyles, px: 3.5 }}>
        <Stack spacing={2} width="100%" sx={{ maxWidth: 360 }}>
          <Alert 
            severity="error" 
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.02),
              borderColor: (theme) => alpha(theme.palette.error.main, 0.2),
              '& .MuiAlert-icon': {
                color: 'error.main'
              }
            }}
          >
            {errorLabel}
          </Alert>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            fullWidth
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              py: 1,
            }}
          >
            {retryLabel}
          </Button>
        </Stack>
      </Box>
    );
  }

  // Fallback default: 'empty' state
  return (
    <Box sx={{ ...containerStyles, px: 4 }}>
      <Stack
        spacing={2.5}
        alignItems="center"
        textAlign="center"
        width="100%"
        sx={{ maxWidth: 320 }}
      >

        <Box
          sx={(theme) => ({
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          })}
        >
          <ReportIcon
            sx={{
              fontSize: 28,
              color: 'primary.main',
            }}
          />
        </Box>

        <Box>
          <Typography
            variant="body1"
            fontWeight={800}
            sx={{ lineHeight: 1.4, letterSpacing: '-0.01em' }}
          >
            {emptyTitle}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75, lineHeight: 1.5 }}
          >
            {emptyDescription}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}