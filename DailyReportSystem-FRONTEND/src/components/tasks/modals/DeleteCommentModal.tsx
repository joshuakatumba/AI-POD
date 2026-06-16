'use client';

import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Modal,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

type DeleteCommentModalProps = {
  open: boolean;
  loading?: boolean;
  commentAuthor?: string | null;
  commentContent?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function DeleteCommentModal({
  open,
  loading = false,
  commentAuthor,
  commentContent,
  onClose,
  onConfirm,
}: DeleteCommentModalProps) {
  const t = useTranslations('tasks');

  const handleConfirm = async () => {
    await onConfirm();
  };

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
        <Box px={3} py={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('detailDrawer.comments.deleteModal.title')}
          </Typography>
        </Box>

        <Divider />

        <Box px={3} py={3}>
          <Typography variant="body2" color="text.secondary">
            {t('detailDrawer.comments.deleteModal.message')}
          </Typography>

          {commentAuthor && (
            <Stack spacing={0.5} mt={2}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {commentAuthor}
              </Typography>
              {commentContent && (
                <Typography
                  variant="body2"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                  }}
                >
                  {commentContent}
                </Typography>
              )}
            </Stack>
          )}
        </Box>

        <Divider />

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
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            disabled={loading}
          >
            {t('detailDrawer.comments.deleteModal.cancel')}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirm()}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading
              ? t('detailDrawer.comments.deleteModal.deleting')
              : t('detailDrawer.comments.deleteModal.confirm')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
