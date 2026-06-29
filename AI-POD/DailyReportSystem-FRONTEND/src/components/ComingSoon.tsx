'use client';

import React from 'react';
import { Box, Typography, Button, keyframes } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useRouter } from 'next/navigation';

// Subtle pulse animation for the icon
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

interface ComingSoonProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export default function ComingSoon({
  title = "Coming Soon",
  description = "We're currently building out this feature to give you more control over your experience. Check back soon for updates!",
  showBackButton = true,
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flex={1}
      minHeight="70vh" // Adjust based on your DashboardShell padding
      textAlign="center"
      px={3}
    >
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'inline-flex',
            p: 2,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            color: 'primary.main',
            opacity: 0.9,
            animation: `${pulse} 2s infinite ease-in-out`,
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 48 }} />
        </Box>
      </Box>

      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        sx={{ fontWeight: 700, color: 'text.primary' }}
      >
        {title}
      </Typography>

      <Typography 
        variant="body1" 
        sx={{ color: 'text.secondary', maxWidth: 500, mb: 4, fontSize: '1.1rem' }}
      >
        {description}
      </Typography>

      {showBackButton && (
        <Button
          variant="contained"
          size="large"
          onClick={() => router.back()}
          sx={{ px: 4, py: 1, borderRadius: 2, textTransform: 'none' }}
        >
          Go Back
        </Button>
      )}
    </Box>
  );
}