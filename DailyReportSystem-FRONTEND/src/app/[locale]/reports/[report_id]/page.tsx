'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  CircularProgress,
  Typography,
  Button,
  Divider,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { ArrowUpward } from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

import { AIReportContent } from '@/components/reports/AIReportContent';
import { ReportDetailsCard } from '@/components/reports/ReportDetailsCard';
import ReportCommentNode from '@/components/reports/ReportCommentNode';
import DeleteReportCommentModal from '@/components/reports/modals/DeleteReportCommentModal';
import {
  ReportCommentThreadNode,
  ReportCommentType,
  ReportMeta,
  ReportResponseType,
  ReportTaskType,
} from '@/_types/reports';
import { getReportDetailsAPI, invalidateReportAPI } from '@/app/[locale]/reports/index';
import {
  createReportCommentAPI,
  deleteReportCommentAPI,
  getReportCommentsAPI,
  updateReportCommentAPI,
} from '@/app/[locale]/reports/[report_id]/index';
import { useAuth } from '@/app/_contexts/AuthContext';
import { BaseTaskType } from '@/_types/task';
import TaskRow from '@/components/chat/TaskRow';
import { applyTranslations as applyTaskTranslations } from '@/utils/taskTranslations';
import { useToast } from '@/app/_providers/ToastProvider';
import InvalidReportModal from '@/components/modals/InvalidReportModal';
import PermissionTooltip from '@/components/PermissionTooltip';
import { INVALIDATE_REPORT_TOOLTIP } from '@/constants/permissionMessages';
import { usePathname } from 'next/navigation';
import { applyTranslations } from '@/utils/reportTranslations';
import { applyTranslations as translateReportComment } from '@/utils/reportCommentTranslations';

const getCommentTimestamp = (createdAt: string | undefined, fallbackOrder: number): number => {
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;
  if (!Number.isNaN(createdAtMs)) {
    return createdAtMs;
  }
  return Number.MAX_SAFE_INTEGER - fallbackOrder;
};

const sortThreadNodes = (nodes: ReportCommentThreadNode[]): ReportCommentThreadNode[] => {
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

function buildReportMeta(report: ReportResponseType): ReportMeta {
  return {
    title: report.session.title,
    id: report.reference,
    owner: report.membership.display_name,
    project: report.project.name,
    organisation: report.organisation.name,
    date: new Date(report.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}

export default function ReportDetailsPage() {
  const t = useTranslations('report.reportsDetails');
  const locale = useLocale();
  const { user, memberships } = useAuth();
  const params = useParams();
  const router = useRouter();
  const showToast = useToast();
  const reportId = params.report_id as string;
  const pathname = usePathname();
  const selectedLanguage = pathname.split('/')[1] || 'en';

  const [report, setReport] = useState<ReportResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isinvalidating, setIsInvalidating] = useState(false);
  const [invalidModalOpen, setInvalidModalOpen] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);
  const [commentList, setCommentList] = useState<ReportCommentType[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [creatingReplyToCommentId, setCreatingReplyToCommentId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentPendingDeleteId, setCommentPendingDeleteId] = useState<string | null>(null);

  const isOrganisationAdmin = memberships?.some(
    (membership) => membership.role === 'admin' && membership.is_current
  ) ?? false;

  const isProjectAdmin = report?.project?.members?.some(
    (member) => member.member_id === user?.membership && member.role === 'admin'
  ) ?? false;

  const fetchReportDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedReport = await getReportDetailsAPI(reportId);

      const translatedReport = applyTranslations(
        fetchedReport,
        (fetchedReport as any).translations || [],
        selectedLanguage
      );

      setReport(translatedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidReport = async () => {
    setInvalidModalOpen(true);
  };

  const handleConfirmInvalidReport = async (id: string) => {
    try {
      setIsInvalidating(true);
      await invalidateReportAPI(id);
      showToast({ message: t('toasts.invalidate.success'), severity: 'success' });
      router.push(`/${params.locale}/reports`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.invalidate.error');
      showToast({ message: errorMessage, severity: 'error' });
    } finally {
      setIsInvalidating(false);
    }
  };

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setError(t('error.generic'));
      return;
    }
    fetchReportDetails();
  }, [reportId, selectedLanguage]);

  useEffect(() => {
    if (!reportId) return;

    let isActive = true;

    const fetchComments = async () => {
      setIsCommentsLoading(true);
      try {
        const reportComments = await getReportCommentsAPI(reportId);
        if (!isActive) return;

        const translatedReportComments = reportComments.map((comment) =>
          translateReportComment(comment, comment.translations || [], selectedLanguage)
        );
        
        setCommentList(translatedReportComments);
      } catch (err) {
        if (!isActive) return;
        setCommentList([]);
        console.error('Failed to fetch report comments', err);
      } finally {
        if (isActive) setIsCommentsLoading(false);
      }
    };

    fetchComments();

    return () => {
      isActive = false;
    };
  }, [reportId]);

  const commentThreadRoots = useMemo(() => {
    const nodesById = new Map<string, ReportCommentThreadNode>();
    const childNodeIds = new Set<string>();

    commentList.forEach((comment, index) => {
      const parentId = comment.parent?.id ?? null;
      nodesById.set(comment.id, {
        id: comment.id,
        parentId,
        comment,
        displayContent: comment.is_deleted ? t('comments.thread.deletedParentBody') : comment.content,
        children: [],
        isDeletedPlaceholder: false,
        createdAtMs: getCommentTimestamp(comment.created_at, commentList.length - index),
      });
    });

    const getOrCreateDeletedParentNode = (parentId: string): ReportCommentThreadNode => {
      const existingNode = nodesById.get(parentId);
      if (existingNode) return existingNode;

      const deletedParentNode: ReportCommentThreadNode = {
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
        if (currentParentId === nodeId) return true;
        const parentNode = nodesById.get(currentParentId);
        if (!parentNode || parentNode.isDeletedPlaceholder) return false;
        currentParentId = parentNode.parentId;
      }
      return false;
    };

    for (const node of nodesById.values()) {
      if (node.isDeletedPlaceholder) continue;
      if (!node.parentId || node.parentId === node.id || createsCycle(node.id, node.parentId)) continue;

      const parentNode = nodesById.get(node.parentId) ?? getOrCreateDeletedParentNode(node.parentId);
      parentNode.children.push(node);
      childNodeIds.add(node.id);

      if (parentNode.isDeletedPlaceholder) {
        parentNode.createdAtMs = Math.min(parentNode.createdAtMs, node.createdAtMs);
      }
    }

    const rootNodes = Array.from(nodesById.values()).filter((node) => (
      !childNodeIds.has(node.id) && (!node.isDeletedPlaceholder || node.children.length > 0)
    ));

    return sortThreadNodes(rootNodes);
  }, [commentList, t]);

  const commentPendingDelete = useMemo(() => (
    commentList.find((c) => c.id === commentPendingDeleteId) ?? null
  ), [commentList, commentPendingDeleteId]);

  const pendingDeleteDisplayContent = commentPendingDelete?.content ?? '';

  const formatCommentTimestamp = (createdAt?: string): string => {
    if (!createdAt) return t('comments.time.justNow');
    const parsedDate = new Date(createdAt);
    if (Number.isNaN(parsedDate.getTime())) return t('comments.time.justNow');
    return `${parsedDate.toLocaleDateString()} ${parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const isOwnComment = (comment: ReportCommentType): boolean => {
    if (!user) return false;
    const currentMembership = user.memberships?.find((m) => m.id === user.membership);
    const currentDisplayName = currentMembership?.display_name?.trim().toLowerCase();
    const commentDisplayName = comment.membership?.display_name?.trim().toLowerCase();
    return (
      comment.created_by === user.user_id
      || comment.membership?.id === user.membership
      || (!!currentDisplayName && !!commentDisplayName && currentDisplayName === commentDisplayName)
    );
  };

  const canEditComment = (comment: ReportCommentType): boolean => {
    if (comment.is_deleted) return false;
    return isOwnComment(comment);
  };

  const canDeleteComment = (comment: ReportCommentType): boolean => (
    !comment.is_deleted && (isOwnComment(comment) || isOrganisationAdmin || isProjectAdmin)
  );

  const handleStartEditComment = (comment: ReportCommentType) => {
    if (comment.is_deleted) return;
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setReplyingToCommentId(null);
    setReplyContent('');
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveEditedComment = async (commentId: string) => {
    const displayContent = editingContent.trim();
    if (!displayContent || !reportId || isUpdatingComment) return;

    const originalComment = commentList.find((c) => c.id === commentId);
    if (!originalComment || originalComment.is_deleted) return;

    const content = displayContent;

    setIsUpdatingComment(true);
    try {
      const updatedComment = await updateReportCommentAPI(reportId, commentId, { content });
      setCommentList((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));
      setEditingCommentId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Failed to update report comment', err);
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleRequestDeleteComment = (commentId: string) => {
    if (deletingCommentId) return;
    setCommentPendingDeleteId(commentId);
  };

  const handleCloseDeleteModal = () => {
    if (deletingCommentId) return;
    setCommentPendingDeleteId(null);
  };

  const handleConfirmDeleteComment = async () => {
    if (!reportId || !commentPendingDeleteId || deletingCommentId) return;

    const targetCommentId = commentPendingDeleteId;
    setDeletingCommentId(targetCommentId);

    try {
      await deleteReportCommentAPI(reportId, targetCommentId);
      setCommentList((prev) => prev.map((comment) => {
        if (comment.id !== targetCommentId) return comment;
        return {
          ...comment,
          content: '',
          is_deleted: true,
          is_deleted_at: comment.is_deleted_at ?? new Date().toISOString(),
        };
      }));

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
    } catch (err) {
      console.error('Failed to delete report comment', err);
    } finally {
      setDeletingCommentId(null);
      setCommentPendingDeleteId(null);
    }
  };

  const handleToggleThread = (commentId: string) => {
    setExpandedThreads((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleStartReplyComment = (commentId: string) => {
    const parentComment = commentList.find((comment) => comment.id === commentId);
    if (!parentComment || parentComment.is_deleted) return;

    setReplyingToCommentId(commentId);
    setReplyContent('');
    setEditingCommentId(null);
    setEditingContent('');
    setExpandedThreads((prev) => ({ ...prev, [commentId]: true }));
  };

  const handleCancelReplyComment = () => {
    setReplyingToCommentId(null);
    setReplyContent('');
  };

  const handleAddReply = async (parentCommentId: string) => {
    const content = replyContent.trim();
    if (!content || !reportId || !!creatingReplyToCommentId) return;
    const parentComment = commentList.find((comment) => comment.id === parentCommentId);
    if (!parentComment || parentComment.is_deleted) return;

    setCreatingReplyToCommentId(parentCommentId);
    try {
      const createdComment = await createReportCommentAPI(reportId, {
        content,
        parent: parentCommentId,
      });
      setCommentList((prev) => [...prev, createdComment]);
      setReplyingToCommentId(null);
      setReplyContent('');
      setExpandedThreads((prev) => ({ ...prev, [parentCommentId]: true }));
    } catch (err) {
      console.error('Failed to create report reply', err);
    } finally {
      setCreatingReplyToCommentId(null);
    }
  };

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content || !reportId || isCreatingComment) return;

    setIsCreatingComment(true);
    try {
      const createdComment = await createReportCommentAPI(reportId, { content });
      setCommentList((prev) => [...prev, createdComment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to create report comment', err);
    } finally {
      setIsCreatingComment(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <CircularProgress size={22} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          {t('loading.report')}
        </Typography>
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <Typography variant="body2" color="error">
          {t('error.generic')}
        </Typography>
        <Button size="small" variant="outlined" onClick={fetchReportDetails}>
          {t('error.retry')}
        </Button>
      </Box>
    );
  }

  const tasks: ReportTaskType[] = report.report_tasks;
  const reportMeta = buildReportMeta(report);
  const isReportOwner = user?.membership === report?.membership?.id;

  return (
    <Box sx={{ height: '100%' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ height: { xs: 'auto', md: '93vh' }, minHeight: { xs: '93vh', md: 'auto' }, p: 2 }}
      >
        {/* Generated Report Area - Left column */}
        <Paper
          elevation={0}
          sx={{
            flex: 2,
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          }}
        >
          <Stack sx={{ flex: 2, width: '100%', minWidth: 0, height: '100%' }}>
            <AIReportContent
              reportId={report.reference}
              reportTitle={report.session.title}
              generatedText={report.generated_text}
              reportStatus={report.status}
            />
          </Stack>
        </Paper>

        {/* Display Area - Right column */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            gap: 1.5,
            overflow: 'hidden',
            minHeight: 0,
            p: 2,
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h6" fontWeight={600}>
              {t('title')}
            </Typography>
            <PermissionTooltip
              restricted={!isReportOwner}
              message={INVALIDATE_REPORT_TOOLTIP}
              ariaLabel={t('invalidReport.title')}
            >
              <Button
                variant="contained"
                size="small"
                color="error"
                onClick={() => {
                  if (isinvalidating) return;
                  handleInvalidReport();
                }}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  fontWeight: 600,
                  boxShadow: 'none',
                  ...(isinvalidating && { opacity: 0.6, cursor: 'wait' }),
                }}
                aria-busy={isinvalidating}
              >
                {isinvalidating ? t('invalidReport.deleting') : t('invalidReport.title')}
              </Button>
            </PermissionTooltip>
          </Box>
          <Box sx={{
            overflow: 'auto',
            p: 2
          }}>
            <ReportDetailsCard report={reportMeta} />
          </Box>

          <Divider />

          {/* Bottom: Tabs for Tasks and Comments */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 0 }}
            >
              <Tab
                label={t('tabs.tasks', { count: tasks.filter((rt) => rt.task !== null).length })}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
              />
              <Tab
                label={t('tabs.comments', { count: commentList.length })}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
              />
            </Tabs>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, '&::-webkit-scrollbar': { width: 5 } }}>
              {tabIndex === 0 && (
                tasks
                  .filter(
                    (report_task): report_task is typeof report_task & { task: BaseTaskType } =>
                      report_task.task !== null,
                  )
                  .map((report_task) => {
                    const translatedTask = applyTaskTranslations(
                      report_task.task,
                      (report_task.task as any).translations || [],
                      locale
                    );
                    return (
                      <TaskRow
                        key={translatedTask.id}
                        task={translatedTask}
                        checkable={false}
                        selected={false}
                        onToggle={(id) => console.log('Selected:', id)}
                      />
                    );
                  })
              )}

              {tabIndex === 1 && (
                <Stack spacing={2.5}>
                  {isCommentsLoading && (
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">
                        {t('comments.loading')}
                      </Typography>
                    </Stack>
                  )}

                  {!isCommentsLoading && commentThreadRoots.map((node) => (
                    <ReportCommentNode
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
                      canEditComment={canEditComment}
                      canDeleteComment={canDeleteComment}
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
                    <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', mt: 4 }}>
                      {t('comments.empty')}
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>

            {tabIndex === 1 && (
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  size="small"
                  placeholder={t('comments.editor.placeholder')}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleAddComment();
                    }
                  }}
                  InputProps={{
                    sx: { borderRadius: 3, bgcolor: 'action.hover', '& fieldset': { border: 'none' }, pr: 0.5 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          color="primary"
                          disabled={!newComment.trim() || isCreatingComment || isCommentsLoading || !!creatingReplyToCommentId}
                          onClick={() => void handleAddComment()}
                          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 28, height: 28 }}
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
      </Stack>

      <DeleteReportCommentModal
        open={!!commentPendingDelete}
        loading={!!deletingCommentId}
        commentAuthor={commentPendingDelete?.membership?.display_name}
        commentContent={pendingDeleteDisplayContent}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteComment}
      />
      <InvalidReportModal
        open={invalidModalOpen}
        report={report ? { id: report.id, reference: report.reference } : null}
        onClose={() => setInvalidModalOpen(false)}
        onConfirm={handleConfirmInvalidReport}
      />
    </Box>
  );
}