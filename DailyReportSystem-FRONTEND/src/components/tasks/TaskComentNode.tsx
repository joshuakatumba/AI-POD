import React from 'react';
import {
  Stack,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Box,
} from '@mui/material';
import { CommentThreadNode, TaskCommentType } from '@/_types/task';
import { useTranslations } from 'next-intl';


type TaskCommentNodeProps = {
  node: CommentThreadNode;
  depth?: number;
  expandedThreads: Record<string, boolean>;
  editingCommentId: string | null;
  editingContent: string;
  replyingToCommentId: string | null;
  replyContent: string;
  deletingCommentId: string | null;
  creatingReplyToCommentId: string | null;
  isUpdatingComment: boolean;

  canManageComment: (comment: TaskCommentType) => boolean;
  setEditingContent: (value: string) => void;
  setReplyContent: (value: string) => void;

  onStartReply: (commentId: string) => void;
  onStartEdit: (comment: TaskCommentType) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => Promise<void>;
  onRequestDelete: (commentId: string) => void;
  onCancelReply: () => void;
  onAddReply: (commentId: string) => Promise<void>;
  onToggleThread: (commentId: string) => void;

  formatCommentTimestamp: (createdAt?: string) => string;
};

const TaskCommentNode: React.FC<TaskCommentNodeProps> = ({
  node,
  depth = 0,
  expandedThreads,
  editingCommentId,
  editingContent,
  replyingToCommentId,
  replyContent,
  deletingCommentId,
  creatingReplyToCommentId,
  isUpdatingComment,
  canManageComment,
  setEditingContent,
  setReplyContent,
  onStartReply,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
  onCancelReply,
  onAddReply,
  onToggleThread,
  formatCommentTimestamp,
}) => {
  const t = useTranslations('tasks');
  const comment = node.comment;
  const hasChildren = node.children.length > 0;
  const isThreadExpanded = expandedThreads[node.id] ?? false;
  const isDeletedParent = node.isDeletedPlaceholder;
  const canManage = !!comment && canManageComment(comment);
  const isEditing = !!comment && editingCommentId === comment.id;
  const isReplying = !!comment && replyingToCommentId === comment.id;
  const isDeleting = !!comment && deletingCommentId === comment.id;

  return (
    <Stack
      spacing={1}
      key={`${isDeletedParent ? 'deleted-parent' : 'comment'}-${node.id}`}
      sx={{
        ml: depth === 0 ? 0 : 1,
        pl: depth === 0 ? 0 : 1.5,
        borderLeft: depth === 0 ? 'none' : '2px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, ml: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {isDeletedParent
            ? t('detailDrawer.comments.thread.deletedParentAuthor')
            : comment?.membership?.display_name}
        </Typography>

        {!isDeletedParent && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatCommentTimestamp(comment?.created_at)}
          </Typography>
        )}

        {!isDeletedParent && comment && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
            <Button
              size="small"
              onClick={() => onStartReply(comment.id)}
              sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
            >
              {t('detailDrawer.comments.actions.reply')}
            </Button>

            {canManage && (
              <>
                <Button
                  size="small"
                  onClick={() => onStartEdit(comment)}
                  sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
                >
                  {t('detailDrawer.comments.actions.edit')}
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={isDeleting}
                  onClick={() => onRequestDelete(comment.id)}
                  sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
                >
                  {t('detailDrawer.comments.actions.delete')}
                </Button>
              </>
            )}
          </Stack>
        )}
      </Stack>

      {isEditing ? (
        <Stack
          spacing={1}
          sx={{
            p: 1.5,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button size="small" onClick={onCancelEdit} sx={{ textTransform: 'none' }}>
              {t('detailDrawer.comments.editor.cancel')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!editingContent.trim() || isUpdatingComment}
              onClick={() => void onSaveEdit(node.id)}
            >
              {t('detailDrawer.comments.editor.save')}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Typography
          variant="body2"
          sx={{
            p: 1.5,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            lineHeight: 1.5,
            color: 'text.primary',
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
          }}
        >
          {node.displayContent}
        </Typography>
      )}

      {isReplying && comment && (
        <Stack spacing={1}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button size="small" onClick={onCancelReply}>
              {t('detailDrawer.comments.editor.cancel')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!replyContent.trim()}
              onClick={() => void onAddReply(comment.id)}
              startIcon={
                creatingReplyToCommentId === comment.id ? (
                  <CircularProgress size={14} color="inherit" />
                ) : null
              }
            >
              {t('detailDrawer.comments.thread.addReply')}
            </Button>
          </Stack>
        </Stack>
      )}

      {hasChildren && (
        <>
          <Button
            size="small"
            onClick={() => onToggleThread(node.id)}
            sx={{ alignSelf: 'flex-start', minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.72rem' }}
          >
            {isThreadExpanded
              ? t('detailDrawer.comments.thread.hideReplies')
              : t('detailDrawer.comments.thread.viewReplies', { count: node.children.length })}
          </Button>

          {isThreadExpanded && (
            <Stack spacing={2} sx={{ pl: 2 }}>
              {node.children.map((child) => (
                <TaskCommentNode
                  key={child.id}
                  {...{
                    node: child,
                    depth: depth + 1,
                    expandedThreads,
                    editingCommentId,
                    editingContent,
                    replyingToCommentId,
                    replyContent,
                    deletingCommentId,
                    creatingReplyToCommentId,
                    isUpdatingComment,
                    canManageComment,
                    setEditingContent,
                    setReplyContent,
                    onStartReply,
                    onStartEdit,
                    onCancelEdit,
                    onSaveEdit,
                    onRequestDelete,
                    onCancelReply,
                    onAddReply,
                    onToggleThread,
                    formatCommentTimestamp,
                    t,
                  }}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
};

export default TaskCommentNode;