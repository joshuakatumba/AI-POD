'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  Link,
} from '@mui/material';
import {
  CalendarToday,
  FormatListBulletedOutlined,
  ManageAccounts,
  Person,
} from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  getProjectByIdAPI,
  updateProjectAPI,
  deleteProjectAPI,
} from '@/app/[locale]/projects/index';
import { getProjectTasksAPI } from '@/app/[locale]/projects/[project_id]/tasks/index';
import { ProjectResponseType } from '@/_types/project';
import { TaskResponseType } from '@/_types/task';
import { useAuth } from '@/app/_contexts/AuthContext';
import { useToast } from '@/app/_providers/ToastProvider';
import DeleteProjectModal from '@/components/modals/DeleteProject';
import EditProjectModal from '@/components/modals/EditProject';
import { EditProjectPayloadType } from '@/_types/project';
import HeaderHero from '@/components/projects/modals/details/HeaderHero';
import StatsCards from '@/components/projects/modals/details/StatCards';
import TaskProgressChart from '@/components/projects/modals/details/TaskStats';
import { ReportResponseType } from '@/_types/reports';
import { getReportsAPI } from '@/app/[locale]/reports';

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.project_id as string;
  const locale = params?.locale as string;
  const pathname = usePathname();

  const t = useTranslations('projects');
  const { user } = useAuth();
  const showToast = useToast();

  const [project, setProject] = useState<ProjectResponseType | null>(null);
  const [tasks, setTasks] = useState<TaskResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [reports, setReports] = useState<ReportResponseType[]>([]);

  // Task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    cancelled: tasks.filter((t) => t.status === 'cancelled').length,
  };

  // Member role statistics - excluding deleted members
  const activeMembers = project?.members?.filter((m) => !m.is_deleted) || [];
  const memberStats = {
    total: activeMembers.length,
    admins: activeMembers.filter((m) => m.role === 'admin').length,
    contributors: activeMembers.filter((m) => m.role === 'contributor').length,
  };

  // Reports count (placeholder - replace with actual data when available)
  const reportsCount = {
    total: reports.length,
    submitted: reports.filter((report) => report.generated_text?.trim()).length,
  };

  // Worklogs count (placeholder - replace with actual data when available)
  const worklogsCount = 0;

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, tasksData, reportsData] = await Promise.all([
        getProjectByIdAPI(projectId),
        getProjectTasksAPI(projectId),
        getReportsAPI({ project: projectId }),
      ]);
      setProject(projectData);
      setTasks(tasksData);
      setReports(reportsData);
    } catch (error) {
      showToast({ message: t('adminActions.fetchError'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'on_hold':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'active':
        return t('status.active');
      case 'completed':
        return t('status.completed');
      case 'on_hold':
        return t('status.paused');
      case 'cancelled':
        return t('status.cancelled');
      case 'pending':
        return t('status.pending');
      case 'inactive':
        return t('status.inactive');
      case 'closed':
        return t('status.closed');
      default:
        return status;
    }
  };

  const openDeleteModal = () => setDeleteModal(true);
  const closeDeleteModal = () => setDeleteModal(false);

  const openEditProject = () => setEditProjectModal(true);
  const closeEditProject = () => setEditProjectModal(false);

  const handleDeleteProject = async () => {
    try {
      await deleteProjectAPI(projectId);
      showToast({ message: t('adminActions.deleteSuccess'), severity: 'success' });
      router.push(`/${pathname.split('/')[1]}/projects`);
    } catch (error) {
      showToast({ message: t('adminActions.deleteError'), severity: 'error' });
    } finally {
      closeDeleteModal();
    }
  };

  const handleEditProject = async (id: string, data: EditProjectPayloadType) => {
    try {
      const updated = await updateProjectAPI(projectId, data);
      setProject(updated);
      showToast({ message: t('adminActions.editSuccess'), severity: 'success' });
      closeEditProject();
    } catch (error) {
      showToast({ message: t('adminActions.editError'), severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>{t('details.notFound') || 'Project not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {user && (
        <HeaderHero
          project={project}
          user={user}
          members={project.members}
          getStatusTranslation={getStatusTranslation}
          getStatusColor={getStatusColor}
          t={t}
          openEditProject={openEditProject}
          openDeleteModal={openDeleteModal}
        />
      )}

      {/* TOP ROW: Stats */}
      <Box sx={{ mt: 4, mb: 4, width: '100%' }}>
        <StatsCards
          memberStats={memberStats}
          taskStats={taskStats}
          reportsCount={reportsCount}
          worklogsCount={worklogsCount}
          t={t}
          router={router}
          locale={locale}
          projectId={projectId}
        />
      </Box>

      {/* MAIN CONTENT AREA */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={3}
        sx={{ width: '100%', alignItems: 'stretch' }}
      >
        {/* LEFT COLUMN: Project Overview & Actions */}
        <Stack spacing={3} sx={{ flex: 1, width: '100%' }}>
          {/* Project Overview Card */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              width: '100%',
              flex: 1,
            }}
          >
            <Typography variant="h6" fontWeight={800} mb={2} sx={{ letterSpacing: '-0.5px' }}>
              {t('details.info.title') || 'Project Overview'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 4 }}>
              {project.description ||
                t('description.label') ||
                'No description provided for this project.'}
            </Typography>

            <Divider sx={{ mb: 4 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ width: '100%' }}>
              {/* Dates Stack */}
              <Stack spacing={2} sx={{ flex: 1 }}>
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.disabled"
                    textTransform="uppercase"
                  >
                    {t('details.info.startDate') || 'Start Date'}
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" mt={0.5}>
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2" fontWeight={700}>
                      {project.start_date || t('details.info.startDate')}
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.disabled"
                    textTransform="uppercase"
                  >
                    {t('details.info.dueDate')}
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" mt={0.5}>
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2" fontWeight={700}>
                      {project.end_date || t('details.info.dueDate')}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              {/* Status Stack */}
              <Stack sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="text.disabled"
                  textTransform="uppercase"
                >
                  {t('details.info.status')}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={project?.status ? getStatusTranslation(project.status) : ''}
                    color={project?.status ? (getStatusColor(project.status) as any) : 'default'}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                  />
                </Box>

                {/* Creator Information */}
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.disabled"
                    textTransform="uppercase"
                  >
                    {t('details.info.owner') || 'Created By'}
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" mt={0.5}>
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        bgcolor: 'primary.main',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      {project?.owner_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        noWrap
                        sx={{ color: 'text.primary', letterSpacing: '-0.2px' }}
                      >
                        {project.owner_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ color: 'text.secondary', display: 'block' }}
                      >
                        {
                          project.members?.find(
                            (member) => member.member_name === project.owner_name
                          )?.member_email
                        }
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        {/* RIGHT COLUMN: Sidebar */}
        <Stack spacing={3} sx={{ width: { xs: '100%', lg: '380px' } }}>
          {/* Team List Preview */}
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="subtitle1" fontWeight={800}>
                {t('details.members.count') || 'Members'}
              </Typography>
              <Chip
                label={memberStats.total}
                size="small"
                sx={{ fontWeight: 800, bgcolor: 'primary.lighter', color: 'primary.main' }}
              />
            </Stack>

            <Stack spacing={2} sx={{ width: '100%', mb: 2 }}>
              {project.members?.slice(0, 2).map((member, i) => (
                <Paper
                  key={i}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* Member Avatar */}
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        bgcolor: 'primary.main',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      {member.member_name?.[0] || '?'}
                    </Avatar>

                    {/* Member Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        noWrap
                        sx={{ color: 'text.primary', letterSpacing: '-0.2px' }}
                      >
                        {member.member_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ color: 'text.secondary', display: 'block' }}
                      >
                        {member.member_email}
                      </Typography>
                    </Box>

                    {/* Role Chip with Icons */}
                    <Chip
                      size="small"
                      icon={
                        member.role === 'admin' ? (
                          <ManageAccounts sx={{ fontSize: '1rem !important' }} />
                        ) : (
                          <Person sx={{ fontSize: '1rem !important' }} />
                        )
                      }
                      label={t('details.roles.' + member.role)}
                      color={member.role === 'admin' ? 'error' : 'default'}
                      sx={{
                        fontWeight: 600,
                        borderRadius: 1,
                        '& .MuiChip-icon': {
                          marginLeft: '4px',
                          marginRight: '-4px',
                        },
                      }}
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Link
              component="button"
              variant="body2"
              onClick={() => router.push(`/${locale}/projects/${projectId}/members`)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {t('details.members.link') || 'View all members'}
            </Link>
          </Paper>

          {/* Task Progress Chart */}
          <TaskProgressChart project={project} />
        </Stack>
      </Stack>

      {/* Modals */}
      <DeleteProjectModal
        open={deleteModal}
        project={project}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteProject}
      />
      <EditProjectModal
        open={editProjectModal}
        project={project}
        onClose={closeEditProject}
        onConfirm={handleEditProject}
      />
    </Box>
  );
}
