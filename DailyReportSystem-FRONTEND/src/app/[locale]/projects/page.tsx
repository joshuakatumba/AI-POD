'use client';

import { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Stack,
  Box,
  Chip,
  Button,
  LinearProgress,
  AvatarGroup,
  CircularProgress,
} from '@mui/material';

import {
  DeleteOutline,
  EditOutlined,
  Add as AddIcon,
  FolderOutlined,
  CalendarToday,
  PublicOutlined,
  PeopleOutlined,
  WarningAmberOutlined,   // ── NEW: amber warning for due-soon
  ErrorOutlineOutlined,   // ── NEW: red error for overdue
} from '@mui/icons-material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Link from 'next/link';
import GroupsIcon from '@mui/icons-material/Groups';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/_contexts/AuthContext';
import DeleteProjectModal from '@/components/modals/DeleteProject';
import CreateProjectModal from '@/components/modals/CreateProject';
import PermissionTooltip from '@/components/PermissionTooltip';
import {
  CREATE_PROJECT_TOOLTIP,
  DELETE_PROJECT_ROW_TOOLTIP,
  EDIT_PROJECT_ROW_TOOLTIP,
  PROJECT_CANCELLED_TOOLTIP,
} from '@/constants/permissionMessages';
import { CreateProjectPayloadType, EditProjectPayloadType, ProjectResponseType } from '@/_types/project';
import EditProjectModal from '@/components/modals/EditProject';
import { deleteProjectAPI, getProjectsAPI, createProjectAPI, updateProjectAPI } from '@/app/[locale]/projects/index';
import { useToast } from '@/app/_providers/ToastProvider';
import { usePathname, useRouter } from 'next/navigation';
import { applyTranslations } from '@/utils/projectTranslations';


export default function ProjectsPage() {
  const t = useTranslations('projects');
  const { user, memberships } = useAuth();
  const router = useRouter();
  const showToast = useToast();
  const pathname = usePathname();
  const selectedLanguage = pathname.split('/')[1] || 'en';
  const [projects, setProjects] = useState<ProjectResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOrganisationAdmin = memberships?.find(
    (membership: any) => membership.role === 'admin' && membership.is_current
  );

  const isProjectMember = (project: ProjectResponseType) => {
    return project.members?.find(member => member.member_id === user?.membership);
  };

  const isProjectAdmin = (project: ProjectResponseType) => {
    return project.members?.find(
      member => member.member_id === user?.membership && member.role === 'admin'
    );
  };

  const canEdit = (project: ProjectResponseType) => {
    if (project.status === 'cancelled') return false;
    if (isOrganisationAdmin) return true;
    if ((isProjectAdmin(project))) return true;
  };

  const getProjectEditRestrictionMessage = (project: ProjectResponseType) => {
    if (project.status === 'cancelled') return PROJECT_CANCELLED_TOOLTIP;
    return EDIT_PROJECT_ROW_TOOLTIP;
  };

  const getProjectDeleteRestrictionMessage = (project: ProjectResponseType) => {
    if (project.status === 'cancelled') return PROJECT_CANCELLED_TOOLTIP;
    return DELETE_PROJECT_ROW_TOOLTIP;
  };

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponseType | null>(null);

  // Delete modal handlers
  const openDeleteModal = (project: ProjectResponseType) => {
    setProjectToDelete(project);
    setDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteModal(false);
    setProjectToDelete(null);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const data = await deleteProjectAPI(id);
      if (data) {
        setProjects((prev: ProjectResponseType[]) =>
          prev.map((project) =>
            project.id === id
              ? {
                ...project,
                status: "cancelled",
              }
              : project
          )
        );
      }
      closeDeleteModal();
      showToast({ message: t('modals.deleteProject.deleteSuccess'), severity: 'success', });
    } catch (error) {
      showToast({ message: t('modals.deleteProject.deleteError'), severity: 'error', });
    }
  };

  const [createModal, setCreateModal] = useState(false);

  const openCreate = () => setCreateModal(true);
  const closeCreate = () => setCreateModal(false);

  const handleCreateProject = async (data: CreateProjectPayloadType): Promise<void> => {
    try {
      const newProject = await createProjectAPI(data);

      setProjects((prev: ProjectResponseType[]) => [...prev, newProject]);

      closeCreate();

      showToast({
        message: t('modals.createProject.toasts.create.success'),
        severity: 'success',
      });
    } catch (err: any) {
      showToast({
        message: t('modals.createProject.toasts.create.error'),
        severity: 'error',
      });
      throw err;
    }
    [closeCreate, showToast];
  };

  const [editProjectModal, setEditProjectModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectResponseType | null>(null);

  const openEditProject = (project: ProjectResponseType) => {
    setProjectToEdit(project);
    setEditProjectModal(true);
  };
  const closeEditProject = () => {
    setEditProjectModal(false);
    setProjectToEdit(null);
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjectsAPI();

      const translatedProjects = data.map((project) => {
        return applyTranslations(
          project,
          project.translations || [],
          selectedLanguage
        );
      });
      setProjects(translatedProjects);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects')
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedLanguage, isOrganisationAdmin]);

  const handleEditProject = async (
    projectId: string,
    updates: EditProjectPayloadType
  ): Promise<void> => {
    try {
      const updatedProject = await updateProjectAPI(projectId, updates);

      if (updatedProject) {
        const translatedUpdatedProject = applyTranslations(
          updatedProject,
          updatedProject.translations || [],
          selectedLanguage
        );
        setProjects((prev: ProjectResponseType[]) =>
          prev.map((project) =>
            project.id === projectId
              ? {
                ...project,
                ...translatedUpdatedProject,
              }
              : project
          )
        );
        closeEditProject();
        showToast({
          message: t('modals.editProject.toasts.success'),
          severity: 'success',
        });
      }
    } catch (err: any) {
      showToast({
        message: t('modals.editProject.toasts.error'),
        severity: 'error',
      });
    }
  };

  /* ---------------- TABLE HEADERS ---------------- */

  const headers = [
    'project',
    'creator',
    'team',
    'progress',
    'visibility',   // ── NEW: visibility column added here
    'status',
    'actions',
  ];

  /* ---------------- HELPERS ---------------- */

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'paused':
        return 'warning';
      case 'active':
        return 'primary';
      case 'inactive':
        return 'danger';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      case 'closed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return t('status.completed');
      case 'paused':
        return t('status.paused');
      case 'active':
        return t('status.active');
      case 'inactive':
        return t('status.inactive');
      case 'cancelled':
        return t('status.cancelled');
      case 'pending':
        return t('status.pending');
      case 'closed':
        return t('status.closed');
      default:
        return status;
    }
  };

  // ── NEW: deadline health indicator ──────────────────────────────
  // Returns a label, colour and icon based on how close end_date is
  // to today. Three states:
  //   overdue   → end_date is in the past          → red
  //   due-soon  → end_date is within 7 days        → amber
  //   on-track  → end_date is more than 7 days away → no badge shown
  const getDeadlineHealth = (endDate?: string | null) => {
    if (!endDate) return null;

    const today = new Date();
    const end   = new Date(endDate);

    // Strip time so comparison is date-only
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return {
        label: t('deadline.overdue') || 'Overdue',
        color: 'error' as const,
        icon:  <ErrorOutlineOutlined sx={{ fontSize: 12 }} />,
      };
    }

    if (diffDays <= 7) {
      return {
        label: t('deadline.dueSoon') || `Due in ${diffDays}d`,
        color: 'warning' as const,
        icon:  <WarningAmberOutlined sx={{ fontSize: 12 }} />,
      };
    }

    // On track — no badge needed
    return null;
  };

  // ── NEW: visibility badge indicator ─────────────────────────────
  // Returns a label, icon and colour depending on whether a project
  // is visible to the whole organisation or only its team members.
  const getVisibilityConfig = (visibility?: string) => {
    const v = visibility?.toLowerCase();
    if (v === 'organisation') {
      return {
        label: t('visibility.organisation') || 'Organisation',
        icon: <PublicOutlined sx={{ fontSize: 13 }} />,
        color: 'primary' as const,
      };
    }
    return {
      label: t('visibility.team') || 'Team',
      icon: <PeopleOutlined sx={{ fontSize: 13 }} />,
      color: 'default' as const,
    };
  };

  /* ---------------- UI ---------------- */

  return (
    <div>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {t('title')}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
        <PermissionTooltip
          restricted={!isOrganisationAdmin}
          message={CREATE_PROJECT_TOOLTIP}
          ariaLabel={t('buttons.createProject')}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              px: { xs: 2, sm: 3 },
              py: { xs: 0.8, sm: 1 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              boxShadow: 0,
            }}
            onClick={openCreate}
          >
            {t('buttons.createProject')}
          </Button>
        </PermissionTooltip>
      </Stack>

      {/* TABLE */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          overflowX: 'auto',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          maxHeight: 600,
        }}
      >
        <Table stickyHeader sx={{ minWidth: 700 }}>
          {/* TABLE HEAD LOOP */}
          <TableHead>
            <TableRow>
              {headers.map((key) => (
                <TableCell
                  key={key}
                  sx={{
                    fontWeight: 700,
                    color: 'text.secondary',
                  }}
                >
                  {t(`table.headers.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* TABLE BODY */}
          <TableBody>
            {/* LOADING STATE */}
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {t('state.loading')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : projects.length > 0 ? (
              /* DATA */
              projects.map((project: ProjectResponseType) => (
                <TableRow
                  key={project.id}
                  hover
                  sx={{ cursor: 'pointer', }}
                  onClick={() => router.push(`/${pathname.split('/')[1]}/projects/${project.id}/details`)}
                >
                  {/* PROJECT */}
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          borderRadius: 2,
                          width: 40,
                          height: 40,
                        }}
                      >
                        <FolderOutlined fontSize="small" />
                      </Avatar>

                      <Box>
                        {/* PROJECT NAME */}
                        <Typography fontWeight={700}>{project.name}</Typography>

                        {/* REFERENCE CODE — pulled from project.reference returned by ProjectReadSerializer */}
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mt: 0.5, mb: 0.25 }}
                        >
                          <Chip
                            label={project.reference}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              height: 18,
                              letterSpacing: '0.04em',
                              color: 'primary.main',
                              borderColor: 'primary.light',
                              bgcolor: 'primary.lighter',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        </Stack>

                        {/* DATE RANGE + DEADLINE HEALTH */}
                        {(() => {
                          const health = getDeadlineHealth(project.end_date);
                          return (
                            <Stack
                              direction="row"
                              spacing={0.75}
                              alignItems="center"
                              flexWrap="wrap"
                            >
                              {/* Calendar icon + date range — unchanged */}
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                color="text.secondary"
                              >
                                <CalendarToday sx={{ fontSize: 12 }} />
                                <Typography variant="caption">
                                  {project.start_date} - {project.end_date}
                                </Typography>
                              </Stack>

                              {/* ── NEW: deadline health chip, only shown when
                                  project is overdue or due within 7 days ── */}
                              {health && project.status !== 'completed' && project.status !== 'cancelled' && (
                                <Chip
                                  icon={health.icon}
                                  label={health.label}
                                  size="small"
                                  color={health.color}
                                  variant="filled"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    '& .MuiChip-label': { px: 0.75 },
                                    '& .MuiChip-icon': { fontSize: 11, ml: 0.5 },
                                  }}
                                />
                              )}
                            </Stack>
                          );
                        })()}
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* CREATOR */}
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          fontWeight: 600,
                          width: 28,
                          height: 28,
                        }}
                      >
                        <Typography variant="caption">{project?.owner_name?.[0]}</Typography>
                      </Avatar>
                      <Typography variant="body2">{project.owner_name}</Typography>
                    </Stack>
                  </TableCell>

                  {/* TEAM */}
                  <TableCell>
                    {/* <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      {project.members && project.members.length > 0 ? (
                        <AvatarGroup
                          max={3}
                          sx={{
                            '& .MuiAvatar-root': {
                              width: 28,
                              height: 28,
                              fontSize: 12,
                            },
                          }}
                        >
                          {project.members.map((member, key) => (
                            <Avatar
                              key={key}
                              sx={{
                                bgcolor: 'default',
                                fontWeight: 600,
                                width: 28,
                                height: 28,
                              }}
                            >
                              <Typography variant="caption">{member?.member_name?.charAt(0)}</Typography>
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {t('noProjectMembers')}
                        </Typography>
                      )}
                    </Box> */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'left',
                        alignItems: 'center',
                        position: 'relative', // Necessary for absolute positioning of the button
                        minHeight: 40,
                        cursor: 'pointer',
                        '&:hover .manage-button': { opacity: 1, visibility: 'visible' }, // Show button on hover
                        '&:hover .avatar-group': { opacity: 0.2, filter: 'blur(1px)' }, // Fade avatars on hover
                      }}
                    >
                      {/* 1. THE AVATAR GROUP (Original Content) */}
                      <Box className="avatar-group" sx={{ transition: 'all 0.2s ease-in-out' }}>
                        {project.members && project.members.length > 0 ? (
                          <AvatarGroup
                            max={3}
                            sx={{
                              '& .MuiAvatar-root': {
                                width: 28,
                                height: 28,
                                fontSize: 12,
                              },
                            }}
                          >
                            {project.members.map((member, key) => (
                              <Avatar
                                key={key}
                                sx={{
                                  bgcolor: 'primary.main', // Changed to primary for better look
                                  fontWeight: 600,
                                  width: 28,
                                  height: 28,
                                }}
                              >
                                <Typography variant="caption">{member?.member_name?.charAt(0)}</Typography>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {t('noProjectMembers')}
                          </Typography>
                        )}
                      </Box>

                      {/* 2. THE HOVER BUTTON */}
                      <Button
                        className="manage-button"
                        variant="contained"
                        size="small"
                        component={Link}
                        href={`/${pathname.split('/')[1]}/projects/${project.id}/members`}
                        onClick={(e) => e.stopPropagation()}
                        startIcon={<GroupsIcon sx={{ fontSize: '1rem !important' }} />}
                        sx={{
                          position: 'absolute',
                          whiteSpace: 'nowrap',
                          fontSize: '0.7rem',
                          py: 0.5,
                          px: 1,
                          opacity: 0,
                          visibility: 'hidden',
                          transition: 'all 0.2s ease-in-out',
                          zIndex: 2,
                        }}
                      >
                        {t('manageMembers')}
                      </Button>
                    </Box>
                  </TableCell>

                  {/* PROGRESS */}
                  <TableCell sx={{ width: 180 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'left',
                        alignItems: 'center',
                        position: 'relative', // Necessary for absolute positioning of the button
                        minHeight: 40,
                        cursor: 'pointer',
                        '&:hover .manage-button': { opacity: 1, visibility: 'visible' }, // Show button on hover
                        '&:hover .progress-group': { opacity: 0.2, filter: 'blur(1px)' }, // Fade avatars on hover
                      }}
                    >
                      <Box className="progress-group" sx={{ transition: 'all 0.2s ease-in-out', width: "100%" }}>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" fontWeight={700}>
                            {project.progress || 0}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={project.progress || 0}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'divider',
                            }}
                          />
                        </Stack>
                      </Box>

                      {/* 2. THE HOVER BUTTON */}
                      <Button
                        className="manage-button"
                        variant="contained"
                        size="small"
                        component={Link}
                        href={`/${pathname.split('/')[1]}/projects/${project.id}/tasks`}
                        onClick={(e) => e.stopPropagation()}
                        startIcon={<AssignmentIcon sx={{ fontSize: '1rem !important' }} />}
                        sx={{
                          position: 'absolute',
                          whiteSpace: 'nowrap',
                          fontSize: '0.7rem',
                          py: 0.5,
                          px: 1,
                          opacity: 0,
                          visibility: 'hidden',
                          transition: 'all 0.2s ease-in-out',
                          zIndex: 2,
                        }}
                      >
                        {t('manageTasks')}
                      </Button>
                    </Box>
                  </TableCell>

                  {/* ── NEW: VISIBILITY badge ── */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const config = getVisibilityConfig(project.visibility);
                      return (
                        <Chip
                          icon={config.icon}
                          label={config.label}
                          size="small"
                          color={config.color}
                          variant="outlined"
                          sx={{
                            fontWeight: 600,
                            borderRadius: 1.5,
                            fontSize: 12,
                          }}
                        />
                      );
                    })()}
                  </TableCell>

                  {/* STATUS — unchanged */}
                  <TableCell>
                    <Chip
                      label={getStatusTranslation(project.status)}
                      size="small"
                      color={getStatusColor(project.status) as any}
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        borderRadius: 1.5,
                        fontSize: 12,
                      }}
                    />
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-center">
                      <PermissionTooltip
                        restricted={!canEdit(project)}
                        message={getProjectEditRestrictionMessage(project)}
                        ariaLabel={t('tooltips.edit')}
                      >
                        <IconButton
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProject(project);
                          }}
                        >
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </PermissionTooltip>

                      <PermissionTooltip
                        restricted={!canEdit(project)}
                        message={getProjectDeleteRestrictionMessage(project)}
                        ariaLabel={t('tooltips.delete')}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(project);
                          }}
                          sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </PermissionTooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              /* EMPTY STATE */
              <TableRow>
                <TableCell colSpan={headers.length} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{t('state.noProjects')}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Project Modal */}
      <DeleteProjectModal
        open={deleteModal}
        project={projectToDelete}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteProject}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createModal}
        onClose={closeCreate}
        onConfirm={handleCreateProject}
      />

      {/* Create  Edit Project Modal */}
      <EditProjectModal
        open={editProjectModal}
        project={projectToEdit}
        onClose={closeEditProject}
        onConfirm={handleEditProject}
      />
    </div>
  );
}
