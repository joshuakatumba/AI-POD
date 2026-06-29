import React from 'react';
import {
  Stack,
  Typography,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { ReportCommentThreadNode, ReportCommentType } from '@/_types/reports';
import { useTranslations } from 'next-intl';

type ReportCommentNodeProps = {
  node: ReportCommentThreadNode;
  depth?: number;
  expandedThreads: Record<string, boolean>;
  editingCommentId: string | null;
  editingContent: string;
  replyingToCommentId: string | null;
  replyContent: string;
  deletingCommentId: string | null;
  creatingReplyToCommentId: string | null;
  isUpdatingComment: boolean;

  canEditComment: (comment: ReportCommentType) => boolean;
  canDeleteComment: (comment: ReportCommentType) => boolean;
  setEditingContent: (value: string) => void;
  setReplyContent: (value: string) => void;

  onStartReply: (commentId: string) => void;
  onStartEdit: (comment: ReportCommentType) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => Promise<void>;
  onRequestDelete: (commentId: string) => void;
  onCancelReply: () => void;
  onAddReply: (commentId: string) => Promise<void>;
  onToggleThread: (commentId: string) => void;

  formatCommentTimestamp: (createdAt?: string) => string;
};

const ReportCommentNode: React.FC<ReportCommentNodeProps> = ({
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
  canEditComment,
  canDeleteComment,
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
  const t = useTranslations('report.reportsDetails');
  const comment = node.comment;
  const hasChildren = node.children.length > 0;
  const isThreadExpanded = expandedThreads[node.id] ?? false;
  const isDeletedParent = node.isDeletedPlaceholder;
  const isDeletedComment = !!comment?.is_deleted;
  const canEdit = !!comment && canEditComment(comment);
  const canDelete = !!comment && canDeleteComment(comment);
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
          {(isDeletedParent || isDeletedComment)
            ? t('comments.thread.deletedParentAuthor')
            : comment?.membership?.display_name}
        </Typography>

        {!isDeletedParent && !isDeletedComment && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatCommentTimestamp(comment?.created_at)}
          </Typography>
        )}

        {!isDeletedParent && !isDeletedComment && comment && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
            <Button
              size="small"
              onClick={() => onStartReply(comment.id)}
              sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
            >
              {t('comments.actions.reply')}
            </Button>

            {(canEdit || canDelete) && (
              <>
                {canEdit && (
                  <Button
                    size="small"
                    onClick={() => onStartEdit(comment)}
                    sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
                  >
                    {t('comments.actions.edit')}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="small"
                    color="error"
                    disabled={isDeleting}
                    onClick={() => onRequestDelete(comment.id)}
                    sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
                  >
                    {t('comments.actions.delete')}
                  </Button>
                )}
              </>
            )}
          </Stack>
        )}
      </Stack>

      {(isDeletedParent || isDeletedComment) ? (
        <Typography
          variant="body2"
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            lineHeight: 1.5,
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          {t('comments.thread.deletedParentBody')}
        </Typography>
      ) : isEditing ? (
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
              {t('comments.editor.cancel')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!editingContent.trim() || isUpdatingComment}
              onClick={() => void onSaveEdit(node.id)}
              sx={{ textTransform: 'none' }}
            >
              {t('comments.editor.save')}
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

      {isReplying && comment && !isDeletedComment && (
        <Stack spacing={1} sx={{ pl: 0.5 }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            placeholder={t('comments.thread.replyPlaceholder')}
            value={replyContent}
            disabled={!!creatingReplyToCommentId}
            onChange={(e) => setReplyContent(e.target.value)}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              size="small"
              onClick={onCancelReply}
              sx={{ textTransform: 'none' }}
              disabled={!!creatingReplyToCommentId}
            >
              {t('comments.editor.cancel')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!replyContent.trim() || !!creatingReplyToCommentId}
              onClick={() => void onAddReply(comment.id)}
              sx={{ textTransform: 'none' }}
              startIcon={
                creatingReplyToCommentId === comment.id ? (
                  <CircularProgress size={14} color="inherit" />
                ) : null
              }
            >
              {t('comments.thread.addReply')}
            </Button>
          </Stack>
        </Stack>
      )}

      {hasChildren && (
        <Button
          size="small"
          onClick={() => onToggleThread(node.id)}
          sx={{ alignSelf: 'flex-start', minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.72rem' }}
        >
          {isThreadExpanded
            ? t('comments.thread.hideReplies')
            : t('comments.thread.viewReplies', { count: node.children.length })}
        </Button>
      )}

      {hasChildren && isThreadExpanded && (
        <Stack spacing={2}>
          {node.children.map((child) => (
            <ReportCommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedThreads={expandedThreads}
              editingCommentId={editingCommentId}
              editingContent={editingContent}
              replyingToCommentId={replyingToCommentId}
              replyContent={replyContent}
              deletingCommentId={deletingCommentId}
              creatingReplyToCommentId={creatingReplyToCommentId}
              isUpdatingComment={isUpdatingComment}
              canEditComment={canEditComment}
              canDeleteComment={canDeleteComment}
              setEditingContent={setEditingContent}
              setReplyContent={setReplyContent}
              onStartReply={onStartReply}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onRequestDelete={onRequestDelete}
              onCancelReply={onCancelReply}
              onAddReply={onAddReply}
              onToggleThread={onToggleThread}
              formatCommentTimestamp={formatCommentTimestamp}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default ReportCommentNode;