'use client';

import { TaskAttachmentType, TaskCommentType, TaskType } from '@/_types/task';
import {
  createTaskCommentAPI,
  deleteTaskCommentAPI,
  getTaskCommentsAPI,
  updateTaskCommentAPI,
} from '@/app/[locale]/tasks/comments/index';
import { useAuth } from '@/app/_contexts/AuthContext';
import DeleteCommentModal from '@/components/tasks/modals/DeleteCommentModal';
import {
  Button,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography,
  Tabs,
  Tab,
  TextField,
  Link,
  InputAdornment,
  SvgIconTypeMap,
} from '@mui/material';
import { ArrowUpward, Close as CloseIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import {
  Tag as TagIcon,
  AccountTree as AccountTreeIcon,
  CalendarToday as CalendarTodayIcon,
  Timer as TimerIcon,
  Rule as RuleIcon,
  Person as PersonIcon,
  OpenInFullOutlined as OpenInFullOutlinedIcon,
  ModeEditOutlineOutlined as ModeEditOutlineOutlinedIcon,
  ShareOutlined as ShareOutlinedIcon,
  Flag as FlagIcon,
  Category as CategoryIcon,
  DeleteOutlineOutlined as DeleteOutlineOutlinedIcon,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import TaskAttachmentsList from './TaskAttachmentsList';
import TaskDetailsField from './TaskDetailsField';
import TaskCommentNode from './TaskComentNode';
import {
  getTaskAttachmentsAPI,
  createTaskAttachmentAPI,
  deleteTaskAttachmentAPI,
} from '@/app/[locale]/projects/[project_id]/tasks/index';
import { applyTranslations as translateTaskComment } from '@/utils/taskCommentTranslations';
import { usePathname } from 'next/navigation';

interface TaskDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  task: TaskType | null;
  onEdit: (task: TaskType) => void;
  onDelete?: (task: TaskType) => void;
}

const THREAD_PARENT_PREFIX = '[drs-parent:';
const THREAD_PARENT_PATTERN = /^\[drs-parent:([^\]]+)\]\s*/;

type ParsedThreadContent = {
  parentId: string | null;
  displayContent: string;
};

type CommentThreadNode = {
  id: string;
  parentId: string | null;
  comment: TaskCommentType | null;
  displayContent: string;
  children: CommentThreadNode[];
  isDeletedPlaceholder: boolean;
  createdAtMs: number;
};

const parseThreadContent = (content: string): ParsedThreadContent => {
  const matched = content.match(THREAD_PARENT_PATTERN);

  if (!matched) {
    return { parentId: null, displayContent: content };
  }

  return {
    parentId: matched[1] || null,
    displayContent: content.replace(THREAD_PARENT_PATTERN, ''),
  };
};

const composeThreadContent = (displayContent: string, parentId?: string | null): string => {
  if (!parentId) {
    return displayContent;
  }

  return `${THREAD_PARENT_PREFIX}${parentId}] ${displayContent}`;
};

const getCommentTimestamp = (createdAt: string | undefined, fallbackOrder: number): number => {
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;
  if (!Number.isNaN(createdAtMs)) {
    return createdAtMs;
  }

  return Number.MAX_SAFE_INTEGER - fallbackOrder;
};

const sortThreadNodes = (nodes: CommentThreadNode[]): CommentThreadNode[] => {
  nodes.sort((a, b) => {
    if (a.createdAtMs === b.createdAtMs) {
      return a.id.localeCompare(b.id);
    }

    return a.createdAtMs - b.createdAtMs;
  });

  nodes.forEach((node) => {
    if (node.children.length > 0) {
      sortThreadNodes(node.children);
    }
  });

  return nodes;
};

export default function TaskDetailDrawer({ open, onClose, task, onEdit, onDelete }: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const t = useTranslations('tasks');
  const pathname = usePathname();
  const selectedLanguage = pathname.split('/')[1] || 'en';
  const [tabIndex, setTabIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [commentList, setCommentList] = useState<TaskCommentType[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [creatingReplyToCommentId, setCreatingReplyToCommentId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentPendingDeleteId, setCommentPendingDeleteId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachmentType[]>([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTabIndex(0);
      setNewComment('');
      setReplyingToCommentId(null);
      setReplyContent('');
      setCreatingReplyToCommentId(null);
      setExpandedThreads({});
      setEditingCommentId(null);
      setEditingContent('');
      setCommentPendingDeleteId(null);
      setAttachments([]);
    }
  }, [open, task]);

  useEffect(() => {
    if (!open || !task?.id) {
      return;
    }

    let isActive = true;

    const fetchTaskComments = async () => {
      setIsCommentsLoading(true);

      try {
        const taskComments = await getTaskCommentsAPI(task.id);
        if (!isActive) {
          return;
        }

        const translatedTaskComments = taskComments.map((comment) =>
          translateTaskComment(comment, comment.translations || [], selectedLanguage)
        );

        setCommentList(translatedTaskComments);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCommentList([]);
        console.error('Failed to fetch task comments', error);
      } finally {
        if (isActive) {
          setIsCommentsLoading(false);
        }
      }
    };

    fetchTaskComments();

    return () => {
      isActive = false;
    };
  }, [open, task?.id]);

  useEffect(() => {
    if (!open || !task?.id) return;

    let isActive = true;

    const fetchAttachments = async () => {
      setIsAttachmentsLoading(true);
      try {
        const data = await getTaskAttachmentsAPI(task.id);
        if (isActive) setAttachments(data);
      } catch (error) {
        if (isActive) setAttachments([]);
        console.error('Failed to fetch attachments', error);
      } finally {
        if (isActive) setIsAttachmentsLoading(false);
      }
    };

    fetchAttachments();

    return () => {
      isActive = false;
    };
  }, [open, task?.id]);

  const commentThreadRoots = useMemo(() => {
    const nodesById = new Map<string, CommentThreadNode>();
    const childNodeIds = new Set<string>();

    commentList.forEach((comment, index) => {
      const { parentId, displayContent } = parseThreadContent(comment.content);
      nodesById.set(comment.id, {
        id: comment.id,
        parentId,
        comment,
        displayContent,
        children: [],
        isDeletedPlaceholder: false,
        createdAtMs: getCommentTimestamp(comment.created_at, commentList.length - index),
      });
    });

    const getOrCreateDeletedParentNode = (parentId: string): CommentThreadNode => {
      const existingNode = nodesById.get(parentId);
      if (existingNode) {
        return existingNode;
      }

      const deletedParentNode: CommentThreadNode = {
        id: parentId,
        parentId: null,
        comment: null,
        displayContent: '',
        children: [],
        isDeletedPlaceholder: true,
        createdAtMs: Number.MAX_SAFE_INTEGER,
      };

      nodesById.set(parentId, deletedParentNode);
      return deletedParentNode;
    };

    const createsCycle = (nodeId: string, parentId: string): boolean => {
      let currentParentId: string | null = parentId;

      while (currentParentId) {
        if (currentParentId === nodeId) {
          return true;
        }

        const parentNode = nodesById.get(currentParentId);
        if (!parentNode || parentNode.isDeletedPlaceholder) {
          return false;
        }

        currentParentId = parentNode.parentId;
      }

      return false;
    };

    for (const node of nodesById.values()) {
      if (node.isDeletedPlaceholder) {
        continue;
      }

      if (!node.parentId || node.parentId === node.id || createsCycle(node.id, node.parentId)) {
        continue;
      }

      const parentNode =
        nodesById.get(node.parentId) ?? getOrCreateDeletedParentNode(node.parentId);
      parentNode.children.push(node);
      childNodeIds.add(node.id);

      if (parentNode.isDeletedPlaceholder) {
        parentNode.createdAtMs = Math.min(parentNode.createdAtMs, node.createdAtMs);
      }
    }

    const rootNodes = Array.from(nodesById.values()).filter(
      (node) =>
        !childNodeIds.has(node.id) && (!node.isDeletedPlaceholder || node.children.length > 0)
    );

    return sortThreadNodes(rootNodes);
  }, [commentList]);

  const commentPendingDelete = useMemo(
    () => commentList.find((comment) => comment.id === commentPendingDeleteId) ?? null,
    [commentList, commentPendingDeleteId]
  );

  const pendingDeleteDisplayContent = commentPendingDelete
    ? parseThreadContent(commentPendingDelete.content).displayContent
    : '';

  const formatCommentTimestamp = (createdAt?: string): string => {
    if (!createdAt) {
      return t('detailDrawer.comments.time.justNow');
    }

    const parsedDate = new Date(createdAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return t('detailDrawer.comments.time.justNow');
    }

    return `${parsedDate.toLocaleDateString()} ${parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleAddAttachment = async (attachment: Omit<TaskAttachmentType, 'id'>) => {
    if (!task?.id) return;
    const created = await createTaskAttachmentAPI(task.id, attachment);
    setAttachments(prev => [...prev, created]);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task?.id) return;
    await deleteTaskAttachmentAPI(task.id, attachmentId);
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  if (!task) return null;

  const taskFields = [
    { icon: TagIcon, label: t('detailDrawer.fields.reference'), value: task.reference },
    { icon: AccountTreeIcon, label: t('detailDrawer.fields.project'), value: task.project?.name },
    { icon: FlagIcon, label: t('detailDrawer.fields.priority'), value: task.priority, isPriority: true },
    { icon: CategoryIcon, label: t('detailDrawer.fields.category'), value: task.category, isCategory: true },
    {
      icon: CalendarTodayIcon,
      label: t('detailDrawer.fields.dueDate'),
      value: task.due_date ? new Date(task.due_date).toLocaleDateString() : null,
    },
    {
      icon: TimerIcon,
      label: t('detailDrawer.fields.expectedHours'),
      value: task.expected_hours
        ? `${task.expected_hours} ${t('detailDrawer.fields.hoursSuffix')}`
        : null,
    },
    {
      icon: PersonIcon,
      label: t('detailDrawer.fields.assignedTo'),
      value: task.assigned_to?.name || task.assigned_to?.email || t('noAssignee'),
    },
    { icon: RuleIcon, label: t('detailDrawer.fields.status'), value: task.status, isStatus: true },
  ];

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabIndex(newValue);

  const isOwnComment = (comment: TaskCommentType): boolean => {
    if (!user) {
      return false;
    }

    const currentMembership = user.memberships?.find(
      (membership) => membership.id === user.membership
    );
    const currentDisplayName = currentMembership?.display_name?.trim().toLowerCase();
    const commentDisplayName = comment.membership?.display_name?.trim().toLowerCase();

    return (
      comment.created_by === user.user_id ||
      comment.membership?.id === user.membership ||
      (!!currentDisplayName && !!commentDisplayName && currentDisplayName === commentDisplayName)
    );
  };

  const handleStartEditComment = (comment: TaskCommentType) => {
    const { displayContent } = parseThreadContent(comment.content);
    setEditingCommentId(comment.id);
    setEditingContent(displayContent);
    setReplyingToCommentId(null);
    setReplyContent('');
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveEditedComment = async (commentId: string) => {
    const displayContent = editingContent.trim();
    if (!displayContent || !task?.id || isUpdatingComment) {
      return;
    }

    const originalComment = commentList.find((comment) => comment.id === commentId);
    if (!originalComment) {
      return;
    }

    const { parentId } = parseThreadContent(originalComment.content);
    const content = composeThreadContent(displayContent, parentId);

    setIsUpdatingComment(true);

    try {
      const updatedComment = await updateTaskCommentAPI(task.id, commentId, { content });
      setCommentList((prev) =>
        prev.map((comment) => (comment.id === commentId ? updatedComment : comment))
      );
      setEditingCommentId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Failed to update task comment', error);
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleRequestDeleteComment = (commentId: string) => {
    if (deletingCommentId) {
      return;
    }

    setCommentPendingDeleteId(commentId);
  };

  const handleCloseDeleteModal = () => {
    if (deletingCommentId) {
      return;
    }

    setCommentPendingDeleteId(null);
  };

  const handleConfirmDeleteComment = async () => {
    if (!task?.id || !commentPendingDeleteId || deletingCommentId) {
      return;
    }

    const targetCommentId = commentPendingDeleteId;

    setDeletingCommentId(targetCommentId);

    try {
      await deleteTaskCommentAPI(task.id, targetCommentId);
      setCommentList((prev) => prev.filter((comment) => comment.id !== targetCommentId));

      if (editingCommentId === targetCommentId) {
        setEditingCommentId(null);
        setEditingContent('');
      }

      if (replyingToCommentId === targetCommentId) {
        setReplyingToCommentId(null);
        setReplyContent('');
      }

      if (creatingReplyToCommentId === targetCommentId) {
        setCreatingReplyToCommentId(null);
      }
    } catch (error) {
      console.error('Failed to delete task comment', error);
    } finally {
      setDeletingCommentId(null);
      setCommentPendingDeleteId(null);
    }
  };

  const handleToggleThread = (commentId: string) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleStartReplyComment = (commentId: string) => {
    setReplyingToCommentId(commentId);
    setReplyContent('');
    setEditingCommentId(null);
    setEditingContent('');
    setExpandedThreads((prev) => ({
      ...prev,
      [commentId]: true,
    }));
  };

  const handleCancelReplyComment = () => {
    setReplyingToCommentId(null);
    setReplyContent('');
  };

  const handleAddReply = async (parentCommentId: string) => {
    const content = replyContent.trim();
    if (!content || !task?.id || !!creatingReplyToCommentId) {
      return;
    }

    setCreatingReplyToCommentId(parentCommentId);

    try {
      const createdComment = await createTaskCommentAPI(task.id, {
        content: composeThreadContent(content, parentCommentId),
      });
      setCommentList((prev) => [...prev, createdComment]);
      setReplyingToCommentId(null);
      setReplyContent('');
      setExpandedThreads((prev) => ({
        ...prev,
        [parentCommentId]: true,
      }));
    } catch (error) {
      console.error('Failed to create task reply', error);
    } finally {
      setCreatingReplyToCommentId(null);
    }
  };

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content || !task?.id || isCreatingComment) {
      return;
    }

    setIsCreatingComment(true);

    try {
      const createdComment = await createTaskCommentAPI(task.id, { content });
      setCommentList((prev) => [...prev, createdComment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to create task comment', error);
    } finally {
      setIsCreatingComment(false);
    }
  };

  const renderCommentNode = (node: CommentThreadNode, depth = 0) => {
    const comment = node.comment;
    const hasChildren = node.children.length > 0;
    const isThreadExpanded = expandedThreads[node.id] ?? false;
    const isDeletedParent = node.isDeletedPlaceholder;
    const canManageComment = !!comment && isOwnComment(comment);
    const isEditingCurrentComment = !!comment && editingCommentId === comment.id;
    const isReplyingCurrentComment = !!comment && replyingToCommentId === comment.id;
    const isDeletingCurrentComment = !!comment && deletingCommentId === comment.id;

    return (
      <Stack
        key={`${isDeletedParent ? 'deleted-parent' : 'comment'}-${node.id}`}
        spacing={1}
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
                onClick={() => handleStartReplyComment(comment.id)}
                sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
              >
                {t('detailDrawer.comments.actions.reply')}
              </Button>

              {canManageComment && (
                <>
                  <Button
                    size="small"
                    onClick={() => handleStartEditComment(comment)}
                    sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
                  >
                    {t('detailDrawer.comments.actions.edit')}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={isDeletingCurrentComment}
                    onClick={() => handleRequestDeleteComment(comment.id)}
                    sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontSize: '0.7rem' }}
                  >
                    {t('detailDrawer.comments.actions.delete')}
                  </Button>
                </>
              )}
            </Stack>
          )}
        </Stack>

        {isDeletedParent ? (
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
            {t('detailDrawer.comments.thread.deletedParentBody')}
          </Typography>
        ) : isEditingCurrentComment ? (
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
              <Button size="small" onClick={handleCancelEditComment} sx={{ textTransform: 'none' }}>
                {t('detailDrawer.comments.editor.cancel')}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!editingContent.trim() || isUpdatingComment}
                onClick={() => void handleSaveEditedComment(node.id)}
                sx={{ textTransform: 'none' }}
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

        {!isDeletedParent && comment && isReplyingCurrentComment && (
          <Stack spacing={1} sx={{ pl: 0.5 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              placeholder={t('detailDrawer.comments.thread.replyPlaceholder')}
              value={replyContent}
              disabled={!!creatingReplyToCommentId}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleAddReply(comment.id);
                }
              }}
            />

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button
                size="small"
                onClick={handleCancelReplyComment}
                sx={{ textTransform: 'none' }}
                disabled={!!creatingReplyToCommentId}
              >
                {t('detailDrawer.comments.editor.cancel')}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!replyContent.trim() || !!creatingReplyToCommentId}
                onClick={() => void handleAddReply(comment.id)}
                sx={{ textTransform: 'none' }}
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
          <Button
            size="small"
            onClick={() => handleToggleThread(node.id)}
            sx={{
              alignSelf: 'flex-start',
              minWidth: 0,
              px: 0.75,
              textTransform: 'none',
              fontSize: '0.72rem',
            }}
          >
            {isThreadExpanded
              ? t('detailDrawer.comments.thread.hideReplies')
              : t('detailDrawer.comments.thread.viewReplies', { count: node.children.length })}
          </Button>
        )}

        {hasChildren && isThreadExpanded && (
          <Stack spacing={2}>
            {node.children.map((childNode) => renderCommentNode(childNode, depth + 1))}
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, border: 'none', boxShadow: -10 } }}
    >
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <IconButton size="small" onClick={onClose}>
              <OpenInFullOutlinedIcon fontSize="inherit" sx={{ transform: 'scaleX(-1)' }} />
            </IconButton>
            <Typography variant="caption" color="text.secondary" noWrap>
              {task.project?.name}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => task && onEdit(task)}>
              <ModeEditOutlineOutlinedIcon fontSize="small" />
            </IconButton>
            {onDelete && (
              <IconButton size="small" onClick={() => task && onDelete(task)} color="error">
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small">
              <ShareOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Top Content: Task Overview */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {task.name}
          </Typography>
          <Stack spacing={1}>
            {taskFields.map((f) => (
              <TaskDetailsField key={f.label} {...f} />
            ))}
          </Stack>
        </Box>

        {/* Bottom Content: Tabs & Chat */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            bgcolor: 'background.default',
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            {[
              t('detailDrawer.tabs.description'),
              t('detailDrawer.tabs.comments', { count: commentList.length }),
              t('detailDrawer.tabs.attachments', { count: attachments.length }),
            ].map((l, i) => (
              <Tab
                key={i}
                label={l}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
              />
            ))}
          </Tabs>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 3, '&::-webkit-scrollbar': { width: 5 } }}>
            {tabIndex === 0 && (
              <Box
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                  '& p': { mt: 0, mb: 1.5 },
                  '& a': { color: 'primary.main', textDecoration: 'none' },
                  '& a:hover': { textDecoration: 'underline' },
                  '& ul, & ol': { mt: 0, mb: 1.5, pl: 3 },
                  '& pre': { bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflowX: 'auto' },
                  '& code': { bgcolor: 'action.hover', px: 0.5, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace' },
                }}
              >
                {task.description ? (
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('detailDrawer.descriptionEmpty')}
                  </Typography>
                )}
              </Box>
            )}

            {tabIndex === 1 && (
              <Stack spacing={2.5}>
                {isCommentsLoading && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ mt: 2 }}
                  >
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      {t('detailDrawer.comments.loading')}
                    </Typography>
                  </Stack>
                )}

                {!isCommentsLoading &&
                  commentThreadRoots.map((node) => (
                    <TaskCommentNode
                      key={node.id}
                      node={node}
                      expandedThreads={expandedThreads}
                      editingCommentId={editingCommentId}
                      editingContent={editingContent}
                      replyingToCommentId={replyingToCommentId}
                      replyContent={replyContent}
                      deletingCommentId={deletingCommentId}
                      creatingReplyToCommentId={creatingReplyToCommentId}
                      isUpdatingComment={isUpdatingComment}
                      canManageComment={isOwnComment}
                      setEditingContent={setEditingContent}
                      setReplyContent={setReplyContent}
                      onStartReply={handleStartReplyComment}
                      onStartEdit={handleStartEditComment}
                      onCancelEdit={handleCancelEditComment}
                      onSaveEdit={handleSaveEditedComment}
                      onRequestDelete={handleRequestDeleteComment}
                      onCancelReply={handleCancelReplyComment}
                      onAddReply={handleAddReply}
                      onToggleThread={handleToggleThread}
                      formatCommentTimestamp={formatCommentTimestamp}
                    />
                  ))}

                {!isCommentsLoading && commentList.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    sx={{ textAlign: 'center', mt: 4 }}
                  >
                    {t('detailDrawer.comments.empty')}
                  </Typography>
                )}
              </Stack>
            )}

            {tabIndex === 2 && (
              isAttachmentsLoading ? (
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    {t('detailDrawer.attachments.loading')}
                  </Typography>
                </Stack>
              ) : (
                <TaskAttachmentsList
                  attachments={attachments}
                  editable={true}
                  onAdd={handleAddAttachment}
                  onDelete={handleDeleteAttachment}
                />
              )
            )}
          </Box>

          {/* AI-Style Input Footer */}
          {tabIndex === 1 && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                placeholder={t('detailDrawer.comments.editor.placeholder')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleAddComment();
                  }
                }}
                InputProps={{
                  sx: {
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    '& fieldset': { border: 'none' },
                    pr: 0.5,
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        color="primary"
                        disabled={
                          !newComment.trim() ||
                          isCreatingComment ||
                          isCommentsLoading ||
                          !!creatingReplyToCommentId
                        }
                        onClick={() => void handleAddComment()}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                          width: 28,
                          height: 28,
                        }}
                      >
                        <ArrowUpward fontSize="inherit" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <DeleteCommentModal
        open={!!commentPendingDelete}
        loading={!!deletingCommentId}
        commentAuthor={commentPendingDelete?.membership?.display_name}
        commentContent={pendingDeleteDisplayContent}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteComment}
      />
    </Drawer>
  );
}