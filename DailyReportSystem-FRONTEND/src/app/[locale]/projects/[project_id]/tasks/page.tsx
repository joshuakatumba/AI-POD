'use client';

import { useAuth } from '@/app/_contexts/AuthContext';
import {
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { Add as AddIcon, SearchOutlined } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  createTaskAPI,
  getProjectTasksAPI,
  updateTaskAPI,
  deleteTaskAPI,
} from '@/app/[locale]/projects/[project_id]/tasks/index';
import EditTaskModal from '@/components/modals/EditTaskDetails';
import CreateTaskModal from '@/components/tasks/modals/CreateTask';
import {
  CreateTaskFormData,
  EditTaskPayloadType,
  TaskResponseType,
  ProjectMember,
  TaskType,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_CATEGORIES,
} from '@/_types/task';
import { useToast } from '@/app/_providers/ToastProvider';
import { getProjectMembersAPI } from '@/app/[locale]/projects/[project_id]/members/index';
import { applyTranslations } from '@/utils/taskTranslations';
import TaskDetailDrawer from '@/components/tasks/TaskDetailDrawer';
import DeleteTaskModal from '@/components/modals/DeleteTaskDetails';
import TaskTable from '@/components/tasks/taskLists/TaskListTable';
import TaskKanbanBoard from '@/components/tasks/taskLists/TaskKanbanBoard';
import { AnimatePresence, motion } from 'framer-motion';
import { ProjectMemberBase } from '@/_types/projectMembers';

export default function TasksPage() {
  const t = useTranslations('tasks');
  const params = useParams();
  const { user } = useAuth();
  const { project_id } = useParams<{ project_id: string }>();
  const pathname = usePathname();
  const showToast = useToast();
  const router = useRouter();

  const selectedLanguage = pathname.split('/')[1] || 'en';

  const isAdmin = user?.role === 'admin';
  const projectId = params.project_id;

  const [tasks, setTasks] = useState<TaskResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskResponseType | null>(null);

  const [createTaskModal, setCreateTaskModal] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberBase[]>([]);

  const [isProjectMember, setIsProjectMember] = useState<boolean>(false);

  const openCreateTask = () => setCreateTaskModal(true);
  const closeCreateTask = () => setCreateTaskModal(false);

  const [openTaskDrawer, setOpenTaskDrawer] = useState(false);

  const normalizedProjectId = params.project_id as string;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskResponseType | null>(null);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [filteredTasks, setFilteredTasks] = useState<TaskResponseType[]>([]);

  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (normalizedProjectId) {
      fetchProjectTasks(normalizedProjectId);
    }
  }, [normalizedProjectId, selectedLanguage]);

  useEffect(() => {
    if (!project_id) return;
    fetchProjectMembers(project_id);
  }, [project_id]);

  useEffect(() => {
    if (!projectMembers) return;
    setIsProjectMember(projectMembers.some((member) => member.member_id === user?.membership));
  }, [projectMembers, user]);

  useEffect(() => {
    let result = tasks;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((task) => task.name.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      result = result.filter((task) => task.status === statusFilter);
    }

    if (assigneeFilter !== 'all') {
      result = result.filter((task) => task.assigned_to?.id === assigneeFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((task) => task.priority === priorityFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((task) => task.category === categoryFilter);
    }

    setFilteredTasks(result);
  }, [search, statusFilter, assigneeFilter,priorityFilter, categoryFilter, tasks]);

  const fetchProjectMembers = async (projectId: string) => {
    try {
      setLoading(true);
      const data = await getProjectMembersAPI(projectId);
      setProjectMembers(data);
    } catch (err: any) {
      showToast({ message: t('toasts.create.fetchMembersError'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (task: TaskResponseType) => {
    setSelectedTask(task);
    setEditModalOpen(true);
  };

  const closeEditTask = () => {
    setEditModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateConfirm = async (
    projectIdParam: string,
    taskId: string,
    updates: EditTaskPayloadType
  ): Promise<void> => {
    try {
      const updatedTask = await updateTaskAPI(projectIdParam, taskId, updates);

      if (updatedTask) {
        const translatedUpdatedTask = applyTranslations(
          updatedTask,
          updatedTask.translations || [],
          selectedLanguage
        );
        setTasks((prev: TaskResponseType[]) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  ...translatedUpdatedTask,
                }
              : task
          )
        );
        closeEditTask();
        showToast({
          message: t('editTask.toasts.success'),
          severity: 'success',
        });
      }
    } catch (err: any) {
      showToast({
        message: t('editTask.toasts.error'),
        severity: 'error',
      });
    }
  };
  const handleDeleteClick = (task: TaskResponseType) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (taskId: string) => {
    try {
      await deleteTaskAPI(normalizedProjectId, taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      handleDeleteClose();
      showToast({ message: t('toasts.delete.success'), severity: 'success' });
    } catch (error) {
      showToast({ message: t('toasts.delete.error'), severity: 'error' });
    }
  };

  const handleDeleteClose = () => {
    setDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  const fetchProjectTasks = async (projectId: string) => {
    try {
      setLoading(true);
      const data = await getProjectTasksAPI(projectId);

      const translatedTasks = data.map((task) =>
        applyTranslations(task, task.translations || [], selectedLanguage)
      );
      setTasks(translatedTasks);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects tasks');
    } finally {
      setLoading(false);
    }
  };

  const headers = [
    { key: 'name', label: 'name' },
    { key: 'dueDate', label: 'dueDate' },
    { key: 'hours', label: 'hours' },
    { key: 'reportedBy', label: 'reportedBy' },
    { key: 'assignedTo', label: 'assignedTo' },
    { key: 'status', label: 'status' },
    { key: 'actions', label: 'actions' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'backlog':
        return 'default';
      case 'ready':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'blocked':
        return 'error';
      case 'review':
        return 'warning';
      case 'testing':
        return 'secondary';
      case 'done':
        return 'success';
      case 'deployed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status.toLowerCase()) {
      case 'backlog':
        return t('status.backlog');
      case 'ready':
        return t('status.ready');
      case 'in_progress':
        return t('status.in_progress');
      case 'blocked':
        return t('status.blocked');
      case 'review':
        return t('status.review');
      case 'testing':
        return t('status.testing');
      case 'done':
        return t('status.done');
      case 'deployed':
        return t('status.deployed');
      case 'cancelled':
        return t('status.cancelled');
      default:
        return status;
    }
  };

  const getPriorityTranslation = (priority: string) => {
    switch (priority) {
      case 'low':
        return t('priority.low');
      case 'medium':
        return t('priority.medium');
      case 'high':
        return t('priority.high');
      case 'critical':
        return t('priority.critical');
      default:
        return priority;
    }
  };

  const getCategoryTranslation = (category: string) => {
    switch (category) {
      case 'feature':
        return t('category.feature');
      case 'bug':
        return t('category.bug');
      case 'improvement':
        return t('category.improvement');
      case 'documentation':
        return t('category.documentation');
      case 'other':
        return t('category.other');
      default:
        return category;
    }
  };

  const handleCreateTask = async (data: CreateTaskFormData): Promise<void> => {
    try {
      const newTask = await createTaskAPI(project_id, data);
      if (newTask) {
        const translatedNewTask = applyTranslations(
          newTask,
          newTask.translations || [],
          selectedLanguage
        );
        setTasks((prev: TaskResponseType[]) => [translatedNewTask, ...prev]);
        closeCreateTask();
        showToast({
          message: t('toasts.create.success'),
          severity: 'success',
        });
      }
    } catch {
      showToast({
        message: t('toasts.create.error'),
        severity: 'error',
      });
    }
  };

  const handleOpenTaskDrawer = (task: TaskType) => {
    setSelectedTask(task);
    setOpenTaskDrawer(true);
    router.push(`?taskId=${task.id}`);
  };

  const handleCloseTaskDrawer = () => {
    setOpenTaskDrawer(false);
    setSelectedTask(null);
    router.push(``);
  };

  const handleEditTaskDrawerDetails = (task: TaskResponseType) => {
    setSelectedTask(task);
    setEditModalOpen(true);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: `calc(100vh - 64px)`,
      }}
    >
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

        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => {
              if (value) setViewMode(value);
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 1.5,
              },
            }}
          >
            <Tooltip title={t('tooltips.display.table')}>
              <ToggleButton value="table">
                <ViewListIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>

            <Tooltip title={t('tooltips.display.kanban')}>
              <ToggleButton value="kanban">
                <ViewKanbanIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>

          <Tooltip
            title={!isProjectMember ? t('tooltips.notProjectMember') : t('buttons.createTask')}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                boxShadow: 0,
              }}
              onClick={openCreateTask}
              disabled={!isProjectMember}
            >
              {t('buttons.createTask')}
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {/* QUICK FILTERS */}
      <Stack direction="row" spacing={1} mb={2} alignItems="center" sx={{ overflowX: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontWeight: 600 }}>
          {t('filters.quickFilters')}
        </Typography>
        <Chip 
          label={t('filters.assignedToMe')} 
          onClick={() => {
            const myMemberId = projectMembers.find(m => m.member_id === user?.membership)?.id;
            if (myMemberId) {
              setAssigneeFilter(assigneeFilter === myMemberId ? 'all' : myMemberId);
            }
          }} 
          color={projectMembers.find(m => m.member_id === user?.membership)?.id && assigneeFilter === projectMembers.find(m => m.member_id === user?.membership)?.id ? "primary" : "default"}
          variant={projectMembers.find(m => m.member_id === user?.membership)?.id && assigneeFilter === projectMembers.find(m => m.member_id === user?.membership)?.id ? "filled" : "outlined"}
          clickable
          size="small"
        />
        <Chip 
          label={t('filters.inProgress')} 
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          color={statusFilter === 'in_progress' ? "primary" : "default"}
          variant={statusFilter === 'in_progress' ? "filled" : "outlined"}
          clickable
          size="small"
        />
        <Chip 
          label={t('filters.highPriority')} 
          onClick={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')}
          color={priorityFilter === 'high' ? "primary" : "default"}
          variant={priorityFilter === 'high' ? "filled" : "outlined"}
          clickable
          size="small"
        />
        {(assigneeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || search !== '') && (
          <Button 
            size="small" 
            onClick={() => {
              setAssigneeFilter('all');
              setStatusFilter('all');
              setPriorityFilter('all');
              setCategoryFilter('all');
              setSearch('');
            }}
            sx={{ textTransform: 'none', ml: 'auto' }}
          >
            {t('filters.clearAll')}
          </Button>
        )}
      </Stack>
      
      {/* FILTERS */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          size="small"
          placeholder={t('filters.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('filters.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('filters.status')}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t('filters.allStatuses')}</MenuItem>
            {TASK_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {getStatusTranslation(status)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
          <InputLabel>{t('filters.priority')}</InputLabel>
          <Select
            value={priorityFilter}
            label={t('filters.priority')}
            onChange={(e) => setPriorityFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t('filters.allPriorities')}</MenuItem>
            {TASK_PRIORITIES.map((priority) => (
              <MenuItem key={priority} value={priority}>
                {getPriorityTranslation(priority)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
          <InputLabel>{t('filters.category')}</InputLabel>
          <Select
            value={categoryFilter}
            label={t('filters.category')}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t('filters.allCategories')}</MenuItem>
            {TASK_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {getCategoryTranslation(category)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('filters.assignee')}</InputLabel>
          <Select
            value={assigneeFilter}
            label={t('filters.assignee')}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t('filters.allAssignees')}</MenuItem>
            {projectMembers.map(({ id, member_name, member_email }) => (
              <MenuItem key={id} value={id}>
                {member_name?.trim() || member_email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ height: '100%' }}
            >
              <TaskTable
                tasks={filteredTasks}
                loading={loading}
                isAdmin={isAdmin}
                handleOpenTaskDrawer={handleOpenTaskDrawer}
                handleEditClick={handleEditClick}
                handleDeleteClick={handleDeleteClick}
                getStatusTranslation={getStatusTranslation}
                getStatusColor={getStatusColor}
              />
            </motion.div>
          ) : (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ height: '100%' }}
            >
              <TaskKanbanBoard
                tasks={filteredTasks}
                handleOpenTaskDrawer={handleOpenTaskDrawer}
                getStatusTranslation={getStatusTranslation}
                getStatusColor={getStatusColor}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <CreateTaskModal
        open={createTaskModal}
        onClose={closeCreateTask}
        onConfirm={handleCreateTask}
        projectMembers={projectMembers}
        canCreateTask={isProjectMember}
      />

      <EditTaskModal
        open={editModalOpen}
        projectId={normalizedProjectId}
        task={selectedTask}
        onClose={() => setEditModalOpen(false)}
        onConfirm={handleUpdateConfirm}
        projectMembers={projectMembers}
      />

      <DeleteTaskModal
        open={deleteModalOpen}
        task={taskToDelete}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />

      <TaskDetailDrawer
        open={openTaskDrawer}
        onClose={handleCloseTaskDrawer}
        task={selectedTask}
        onEdit={handleEditTaskDrawerDetails}
        onDelete={(task) => {
          handleCloseTaskDrawer();
          handleDeleteClick(task);
        }}
      />
    </Box>
  );
}