'use client';

import { Box, Typography, alpha } from '@mui/material';
import { Public as CultureIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface ChatHeaderProps {
  hasStarted: boolean;
  hasStartedTyping: boolean;
}

export default function ChatHeader({ hasStarted, hasStartedTyping }: ChatHeaderProps) {
  const t = useTranslations('chat.chatBox');

  return (
    <AnimatePresence>
      {!hasStartedTyping && !hasStarted && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          sx={{ textAlign: 'center', mb: 6 }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: 4,
              bgcolor: alpha('#6366F1', 0.1),
              color: '#6366F1',
              mb: 2,
            }}
          >
            <CultureIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-1.5px', mb: 1 }}>
            AI POD
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            {t('subtitle')}
          </Typography>
        </Box>
      )}
    </AnimatePresence>
  );
}