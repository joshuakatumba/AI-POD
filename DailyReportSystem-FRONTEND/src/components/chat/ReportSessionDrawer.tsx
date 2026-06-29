'use client';

import {
  Box,
  Drawer,
  Stack,
  Typography,
  IconButton,
  TextField,
  Divider,
  Button,
  Avatar,
  alpha,
  MenuItem,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Translate as TranslationIcon,
  FactCheckOutlined as RequirementsIcon,
  AnalyticsOutlined as ReportsIcon,
  ArrowForward as ArrowIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getProjectTasksAPI } from '@/app/[locale]/projects/[project_id]/tasks';
import { getProjectsAPI } from '@/app/[locale]/projects';
import { TaskType } from '@/_types/task';
import { ProjectResponseType } from '@/_types/project';
import { useToast } from '@/app/_providers/ToastProvider';
import ReportTaskSelection from './ReportTaskSelection';
import { AiWorkflowType } from '@/_types/workflow';
import { usePathname, useRouter } from 'next/navigation';
import { CreateReportSessionPayloadType } from '@/_types/chat';
import { createSessionAPI, getChatWorkflowsAPI } from '@/app/[locale]/chat';
import { WorkflowResponseType } from '@/_types/admin';
import { useAuth } from '@/app/_contexts/AuthContext'

interface UpdateWorkflowProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportSessionDrawer({
  open,
  onClose,
}: UpdateWorkflowProps) {
  const t = useTranslations('chat');
  const router = useRouter();
  const pathname = usePathname();
  const [isEditing, setIsEditing] = useState(false);
  const showToast = useToast();

  const [aiWorkflows, setAiWorkflows] = useState<AiWorkflowType[]>([]);
  const [aiWorkflow, setAiWorkflow] = useState<WorkflowResponseType | undefined>(undefined);

  const [projects, setProjects] = useState<ProjectResponseType[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { user } = useAuth();

  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    if (!open || !user?.user_id) return;

    fetchProjects(user.user_id);
    fetchAiWorkflow();
  }, [open, user?.user_id]);

  useEffect(() => {
    setSelectedProjectId('');
  }, [!open]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchTasks(selectedProjectId);
  }, [selectedProjectId]);

  const fetchProjects = async (userId: string) => {
    try {
      setProjectsLoading(true);
      const data = await getProjectsAPI({ member_user_id: userId });
      setProjects(data);
    } catch (err) {
      showToast({ message: t('state.fetchAiWorkflowError'), severity: 'error' });
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchAiWorkflow = async () => {
    try {
      const data = await getChatWorkflowsAPI();

      const reportWorkflow = data.find(
        (workflow) => workflow.category === 'report'
      );

      setAiWorkflow(reportWorkflow);
    } catch (err) {
      showToast({ message: t('state.fetchProjectsError'), severity: 'error' });
    } finally {
    }
  };

  const fetchTasks = async (projectId: string) => {
    setTasks([]);
    setTasksLoading(true);
    try {
      const data = await getProjectTasksAPI(projectId);
      setTasks(data);
    } catch (err: any) {
      showToast({ message: t('taskSelection.empty.fetchError'), severity: 'error' });
    } finally {
      setTasksLoading(false);
    }
  };

  const handleStartSession = async (selectedTaskIds: string[]): Promise<void> => {
    if (!aiWorkflow) return;

    const payload: CreateReportSessionPayloadType = {
      "project_id": selectedProjectId,
      "workflow_id": aiWorkflow.id,
      "task_ids": selectedTaskIds,
      "session_type": "report_generation"
    }

    try {
      const newSession = await createSessionAPI(payload);
      if (newSession) {
        router.push(`/${pathname.split("/")[1]}/chat/${newSession.id}/`);

        showToast({
          message: t('toasts.create.success'),
          severity: 'success',
        });
      } else {
        showToast({
          message: t('toasts.create.error'),
          severity: 'error',
        });
      }
    } catch (err: any) {
      showToast({
        message: t('toasts.create.error'),
        severity: 'error',
      });
      throw err;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      // onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 450 },
          border: 'none',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Area */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
            {t("title")}
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{ bgcolor: 'divider' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box
        // sx={{ height: '100%' }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{ height: '93vh', p: 2 }}
          >
            {/* TASKS AREA SLOT - Right column */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden', pt: 2 }}>

              {/* PROJECT SELECTOR */}
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 13 }}>
                  {projectsLoading ? t('state.loadingProjects') : t('state.selectProject')}
                </InputLabel>
                <Select
                  value={selectedProjectId}
                  label={projectsLoading ? t('state.loadingProjects') : t('state.selectProject')}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projectsLoading}
                  startAdornment={projectsLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
                  sx={{ borderRadius: 2, fontSize: 13 }}
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id} sx={{ fontSize: 13 }}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* TASK SELECTION */}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                {!selectedProjectId ? (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                      {t('state.selectProjectPrompt')}
                    </Typography>
                  </Box>
                ) : (
                  <ReportTaskSelection
                    tasks={tasks}
                    loading={tasksLoading}
                    onStartSession={handleStartSession}
                  />
                )}
              </Box>

            </Box>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}