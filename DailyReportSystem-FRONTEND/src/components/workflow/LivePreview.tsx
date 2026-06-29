import { Typography, Paper, alpha, Stack, Avatar, Button, Box, CircularProgress } from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { AiModelType, CreateWorkflowPayloadType } from '@/_types/admin';

interface LivePreviewProps {
  formData: CreateWorkflowPayloadType;
  activeConfig: {
    icon: React.ReactNode;
    color: string;
    label: string;
  };
  aiModels: AiModelType[];
  isValid: boolean;
  submitting: boolean;
  onDeploy: () => void;
}

export default function LivePreview({ formData, activeConfig, isValid, submitting, aiModels, onDeploy }: LivePreviewProps) {
  const t = useTranslations('admin.workflows');

  const modelName = aiModels.find((model) => model.id === formData.ai_model)?.name || 'Model';

  return (
    <Box
      sx={{
        p: 2,
        flex: 0.8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="caption"
        fontWeight={800}
        color="text.disabled"
        sx={{ textTransform: 'uppercase', mb: 2, letterSpacing: '1px' }}
      >
        {t('createWorkflow.livePreview')}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          width: '100%',
          maxWidth: 320,
          boxShadow: `0 10px 30px ${alpha(activeConfig.color, 0.08)}`,
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Avatar
              sx={{
                bgcolor: alpha(activeConfig.color, 0.1),
                color: activeConfig.color,
                width: 56,
                height: 56,
                borderRadius: 3,
              }}
            >
              {activeConfig.icon}
            </Avatar>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                {t(activeConfig.label)}
              </Typography>
            </Box>
          </Stack>

          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.2px' }} noWrap>
              {formData.name || t('createWorkflow.liveName')}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.6,
                height: 44,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {formData.description || t('createWorkflow.liveDescription')}
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="button"
                fontWeight={900}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                {t('launch')}
              </Typography>
              <ArrowIcon sx={{ fontSize: 14 }} />
            </Stack>
            <Typography
              variant="button"
              fontWeight={900}
              sx={{
                textTransform: 'none',
                fontSize: '0.7rem',
                color: activeConfig.color,
                bgcolor: alpha(activeConfig.color, 0.1),
                px: 1,
                py: 0.2,
                borderRadius: 1,
              }}
            >
              {modelName}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
      <Button
        fullWidth
        variant="contained"
        disabled={!isValid || submitting}
        onClick={onDeploy}
        sx={{
          mt: 'auto',
          py: 1.8,
          borderRadius: 3,
          fontWeight: 900,
          textTransform: 'none',
          bgcolor: activeConfig.color,
          '&:hover': { bgcolor: activeConfig.color, opacity: 0.9 },
        }}
      >
        {submitting
          ? <CircularProgress size={20} sx={{ color: 'inherit' }} />
          : t('createWorkflow.buttons.deploy')
        }
      </Button>
    </Box>
  );
}
