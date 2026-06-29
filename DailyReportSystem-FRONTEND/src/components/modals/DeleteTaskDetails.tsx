'use client';

import { useState } from 'react';
import {
  Modal, Box, Typography, Avatar, Button,
  Stack, Divider, CircularProgress,
} from '@mui/material';
import { DeleteOutlineRounded } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { TaskResponseType } from '@/_types/task';

type DeleteTaskModalProps = {
  open: boolean;
  task: TaskResponseType | null;
  onClose: () => void;
  onConfirm: (taskId: string) => Promise<void>;
};

export default function DeleteTaskModal({
  open,
  task,
  onClose,
  onConfirm,
}: DeleteTaskModalProps) {
  const t = useTranslations('tasks.deleteTask');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!task) return;
    setLoading(true);
    try {
      await onConfirm(task.id);
      onClose();
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 24,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box px={3} py={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('title')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'error.lighter',
                color: 'error.main',
                fontWeight: 600,
              }}
            >
              <DeleteOutlineRounded />
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>
                {task.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('subtitle')}
              </Typography>
            </Box>
          </Stack>

          <Typography mt={3} variant="body2" color="text.secondary">
            {t('message')}
          </Typography>
        </Box>

        <Divider />

        {/* Actions */}
        <Box
          px={3}
          py={2}
          display="flex"
          flexDirection={{ xs: 'column-reverse', sm: 'row' }}
          gap={1.5}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {t('buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? t('deleting') : t('buttons.delete')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}