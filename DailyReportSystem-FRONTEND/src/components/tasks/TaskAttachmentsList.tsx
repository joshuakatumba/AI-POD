'use client';

import React, { useState } from 'react';
import {
  Stack,
  Link,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Description as DescriptionIcon,
  Link as LinkIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  DeleteOutline as DeleteIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { TaskAttachmentType } from '@/_types/task';

type AttachmentsListProps = {
  attachments: TaskAttachmentType[];
  editable?: boolean;
  onAdd?: (attachment: Omit<TaskAttachmentType, 'id'>) => Promise<void> | void;
  onDelete?: (attachmentId: string) => Promise<void> | void;
};

const ATTACHMENT_TYPES: TaskAttachmentType['type'][] = ['link', 'github', 'file', 'document'];

export default function TaskAttachmentsList({ 
  attachments, 
  editable = false,
  onAdd,
  onDelete,
}: AttachmentsListProps) {
  const t = useTranslations('tasks');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<TaskAttachmentType | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAttachment, setNewAttachment] = useState({
    title: '',
    url: '',
    type: 'link' as TaskAttachmentType['type'],
  });

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, attachment: TaskAttachmentType) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedAttachment(attachment);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedAttachment(null);
  };

  const handleCopyUrl = () => {
    if (selectedAttachment?.url) {
      navigator.clipboard.writeText(selectedAttachment.url);
    }
    handleCloseMenu();
  };

  const handleDelete = async () => {
    if (selectedAttachment && onDelete) {
      await onDelete(selectedAttachment.id);
    }
    handleCloseMenu();
  };

  const handleAddAttachment = async () => {
    if (newAttachment.title.trim() && newAttachment.url.trim() && onAdd) {
      setIsSubmitting(true);
      try {
        await onAdd(newAttachment);
        setNewAttachment({ title: '', url: '', type: 'link' });
        setIsAddDialogOpen(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsAddDialogOpen(false);
    setNewAttachment({ title: '', url: '', type: 'link' });
  };

  const getAttachmentIcon = (type: TaskAttachmentType['type']) => {
    switch (type) {
      case 'github':
        return <GitHubIcon fontSize="small" />;
      case 'file':
      case 'document':
        return <DescriptionIcon fontSize="small" />;
      default:
        return <LinkIcon fontSize="small" />;
    }
  };

  if (!editable) {
    return (
      <Stack spacing={1.5}>
        {attachments.length > 0 ? (
          attachments.map((item, index) => (
            <Link
              key={item.id || index}
              href={item.url}
              target="_blank"
              rel="noopener"
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                color: 'text.primary',
              }}
            >
              {item.type === 'github' ? (
                <GitHubIcon fontSize="small" />
              ) : (
                <DescriptionIcon fontSize="small" />
              )}
              <Typography variant="body2" noWrap>
                {item.title}
              </Typography>
            </Link>
          ))
        ) : (
          <Typography variant="body2" color="text.disabled">
            {t('detailDrawer.attachments.empty')}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <>
      <Stack spacing={2}>
        {/* Add Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2.5,
              fontWeight: 600,
              px: 3,
              boxShadow: 0,
            }}
          >
            {t('detailDrawer.attachments.addButton')}
          </Button>
        </Box>

        {/* Attachments List */}
        {attachments.length > 0 ? (
          <Stack spacing={1}>
            {attachments.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <Link
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    flex: 1,
                    minWidth: 0,
                    color: 'text.primary',
                  }}
                >
                  <Box sx={{ color: 'primary.main' }}>
                    {getAttachmentIcon(item.type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}>
     
                      {item.url}
                    </Typography>
                  </Box>
                </Link>

                <IconButton
                  size="small"
                  onClick={(e) => handleOpenMenu(e, item)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('detailDrawer.attachments.empty')}
            </Typography>
            <Button
              variant="text"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsAddDialogOpen(true)}
              sx={{ textTransform: 'none', mt: 1 }}
            >
              {t('detailDrawer.attachments.addFirst')}
            </Button>
          </Box>
        )}
      </Stack>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => window.open(selectedAttachment?.url, '_blank')}>
          <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
          {t('detailDrawer.attachments.actions.open')}
        </MenuItem>
        <MenuItem onClick={handleCopyUrl}>
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          {t('detailDrawer.attachments.actions.copyUrl')}
        </MenuItem>
        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            {t('detailDrawer.attachments.actions.delete')}
          </MenuItem>
        )}
      </Menu>

      {/* Add Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="h6" fontWeight={700}>
            {t('detailDrawer.attachments.addDialog.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('detailDrawer.attachments.addDialog.subtitle') || 'Add a link to documentation, GitHub PR, or file'}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              size="small"
              label={t('detailDrawer.attachments.addDialog.titleLabel')}
              value={newAttachment.title}
              onChange={(e) => setNewAttachment({ ...newAttachment, title: e.target.value })}
              placeholder={t('detailDrawer.attachments.addDialog.titlePlaceholder')}
              disabled={isSubmitting}
              autoFocus
            />
            
            <TextField
              fullWidth
              size="small"
              label={t('detailDrawer.attachments.addDialog.urlLabel')}
              value={newAttachment.url}
              onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
              placeholder={t('detailDrawer.attachments.addDialog.urlPlaceholder')}
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              fullWidth
              size="small"
              label={t('detailDrawer.attachments.addDialog.typeLabel')}
              value={newAttachment.type}
              onChange={(e) => setNewAttachment({ ...newAttachment, type: e.target.value as TaskAttachmentType['type'] })}
              disabled={isSubmitting}
            >
              {ATTACHMENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(`detailDrawer.attachments.types.${type}`)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>

        <Divider />

        {/* Actions */}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ width: '100%' }}>
            <Button 
              onClick={handleCloseDialog} 
              variant="outlined" 
              color="inherit"
              disabled={isSubmitting}
              sx={{ textTransform: 'none' }}
            >
              {t('detailDrawer.attachments.addDialog.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleAddAttachment}
              disabled={!newAttachment.title.trim() || !newAttachment.url.trim() || isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: 'none' }}
            >
              {isSubmitting ? t('detailDrawer.attachments.addDialog.adding') || 'Adding...' : t('detailDrawer.attachments.addDialog.add')}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}