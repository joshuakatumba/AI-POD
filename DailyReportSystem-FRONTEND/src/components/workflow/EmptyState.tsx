import { Typography, Box, } from '@mui/material';
import { CloudOffIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function EmptyState () {
  const t = useTranslations("admin.workflows.emptyState")
  
  return (
    <Box
      sx={{
        width: '100%',
        py: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderRadius: 4,
        border: '2px dashed',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        sx={{
          p: 2,
          mb: 2,
          borderRadius: '50%',
          bgcolor: 'background.paper',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          color: 'text.disabled',
        }}
      >
        <CloudOffIcon fontSize={40} />
      </Box>

      <Typography variant="h6" fontWeight="700" color="text.primary">
        {t('title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
        {t('description')}
      </Typography>
    </Box>
  );
}