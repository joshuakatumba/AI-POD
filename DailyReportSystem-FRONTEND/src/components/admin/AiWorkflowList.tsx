'use client';

import { Paper, Stack, Avatar, Typography, Box, alpha } from '@mui/material';
import {
  Translate as TranslationIcon,
  FactCheckOutlined as RequirementsIcon,
  AnalyticsOutlined as ReportsIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import CreateWorkflowModal from '@/components/modals/workflow/CreateWorkflow';
import { Button } from '@mui/material';
import { useState } from 'react';
import UpdateWorkflow from '@/components/workflow/UpdateWorkflow';
import { AiModelType, CreateWorkflowPayloadType, WorkflowResponseType, AiWorkflowUpdatePayloadType, } from '@/_types/admin';
import { useToast } from '@/app/_providers/ToastProvider';
import { createWorkflowAPI, updateWorkflowAPI } from '@/app/[locale]/admin/workflows';
import EmptyState from '@/components/workflow/EmptyState';
import WorkflowCardSkeleton from '@/components/workflow/WorkflowLoadingState';


type AIWorkflowListProps = {
  aiModels: AiModelType[];
  workflows: WorkflowResponseType[];
  workflowsLoading: boolean;
  setWorkflows: React.Dispatch<React.SetStateAction<WorkflowResponseType[]>>;
};

const category_configurations: Record<string, { icon: React.ReactNode; color: string, label: string }> = {
  translation: { icon: <TranslationIcon sx={{ fontSize: 32 }} />, color: '#6366F1', label: 'categories.translation' },
  requirements: { icon: <RequirementsIcon sx={{ fontSize: 32 }} />, color: '#10B981', label: 'categories.requirements' },
  report: { icon: <ReportsIcon sx={{ fontSize: 32 }} />, color: '#F59E0B', label: 'categories.report' },
};

const category_fallback_configurations = {
  icon: <ArrowIcon sx={{ fontSize: 32 }} />,
  color: '#94a3b8',
  label: 'categories.general'
};

export default function AIWorkflowList({ aiModels, workflows, workflowsLoading, setWorkflows }: AIWorkflowListProps) {
  const t = useTranslations('admin.workflows');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedWorkflow, setSelectedFlow] = useState<WorkflowResponseType | null>(null);
  const showToast = useToast();

  const handleCreateWorkflow = async (payload: CreateWorkflowPayloadType): Promise<void> => {
    try {
      const newWorkflow = await createWorkflowAPI(payload);

      setWorkflows((prev) => [...prev, newWorkflow]);

      setIsModalOpen(false);

      showToast({
        message: t('createWorkflow.toasts.success'),
        severity: 'success',
      });
    } catch (err: any) {
      showToast({
        message: t('createWorkflow.toasts.error'),
        severity: 'error',
      });
      throw err;
    }
  };

  const closeUpdateWorkflowDrawer = () => {
    setSelectedFlow(null);
    setIsDrawerOpen(false);
  };

  const handleEditWorkflow = async (
    workflowId: string,
    updates: AiWorkflowUpdatePayloadType
  ): Promise<void> => {
    try {
      const updatedWorkflow = await updateWorkflowAPI(workflowId, updates);

      if (updatedWorkflow) {
        setWorkflows((prev) =>
          prev.map((workflow) =>
            workflow.id === workflowId
              ? {
                  ...workflow,
                  ...updatedWorkflow,
                }
              : workflow
          )
        );
        closeUpdateWorkflowDrawer();
        showToast({
          message: t('updateWorkflow.toasts.success'),
          severity: 'success',
        });
      }
    } catch (err: any) {
      showToast({
        message: t('updateWorkflow.toasts.error'),
        severity: 'error',
      });
    }
  };

  const handleCardClick = (workflow: WorkflowResponseType) => {
    setSelectedFlow(workflow);
    setIsDrawerOpen(true);
  };

  const handleArchiveWorkflowStateUpdate = (workflowId: string) => {
    setWorkflows((prev) =>
      prev.filter((workflow) => workflow.id !== workflowId)
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Section Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-1px' }}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {t('subTitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
          sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none', px: 3, py: 1 }}
        >
          {t("createWorkflow.buttons.create")}
        </Button>
      </Stack>

      {workflowsLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
            width: '100%',
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <WorkflowCardSkeleton key={i} />
          ))}
        </Box>
      ) : workflows.length === 0 ? (
        <EmptyState />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
            width: '100%',
          }}
        >
          {workflows.map((workflow) => {
            const { icon, color, label } =
              category_configurations[workflow.category] ?? category_fallback_configurations;
            const categoryName = t(label);
            return (
              <Paper
                key={workflow.id}
                elevation={0}
                onClick={() => handleCardClick(workflow)}
                sx={{
                  p: 4,
                  flex: 1,
                  borderRadius: 5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  position: 'relative',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    borderColor: color,
                    boxShadow: `0 20px 40px ${alpha(color, 0.12)}`,
                    '& .icon-box': {
                      transform: 'scale(1.1) rotate(-5deg)',
                      bgcolor: color,
                      color: 'white',
                    },
                    '& .arrow-link': {
                      color: color,
                      transform: 'translateX(5px)',
                    },
                  },
                }}
              >
                <Stack spacing={3}>
                  {/* Top Row: Oversized Icon & Status Badge */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Avatar
                      className="icon-box"
                      sx={{
                        bgcolor: alpha(color, 0.1),
                        color: color,
                        width: 64, // Bigger icons
                        height: 64,
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {icon}
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
                        {categoryName}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Text Content */}
                  <Box>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{ mb: 1, letterSpacing: '-0.2px' }}
                    >
                      {workflow.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.7, fontWeight: 500 }}
                    >
                      {workflow.description}
                    </Typography>
                  </Box>

                  {/* Action Area */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    className="arrow-link"
                    sx={{ transition: 'all 0.3s ease', pt: 1, width: '100%' }}
                  >
                    {/* Left Grouping */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="button"
                        fontWeight={900}
                        sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                      >
                        {t('launch')}
                      </Typography>
                      <ArrowIcon sx={{ fontSize: 16 }} />
                    </Stack>

                    {/* Spacer */}
                    <Box sx={{ flex: 1 }} />

                    <Typography
                      variant="button"
                      fontWeight={900}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        color: color,
                        bgcolor: alpha(color, 0.1),
                        px: 1,
                        py: 0.2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: alpha(color, 0.2),
                        letterSpacing: '0.5px',
                      }}
                    >
                      {workflow.ai_model_name}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* The Creation Modal */}
      <CreateWorkflowModal
        open={isModalOpen}
        aiModels={aiModels}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreateWorkflow}
      />

      <UpdateWorkflow
        open={isDrawerOpen}
        onClose={closeUpdateWorkflowDrawer}
        workflow={selectedWorkflow}
        aiModels={aiModels}
        onConfirm={handleEditWorkflow}
        onArchive={handleArchiveWorkflowStateUpdate}
      />
    </Box>
  );
}