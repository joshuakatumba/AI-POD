import React from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CalendarToday,
  DeleteOutline,
  EditOutlined,
  ErrorOutline
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { TaskResponseType } from "@/_types/task";

interface TaskTableProps {
  tasks: TaskResponseType[];
  loading: boolean;
  isAdmin: boolean;
  handleOpenTaskDrawer: (task: TaskResponseType) => void;
  handleEditClick: (task: TaskResponseType) => void;
  handleDeleteClick: (task: TaskResponseType) => void;
  getStatusTranslation: (status: string) => string;
  getStatusColor: (status: string) => string;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  low: { color: 'success.main', bg: 'success.lighter' },
  medium: { color: 'info.main', bg: 'info.lighter' },
  high: { color: 'warning.main', bg: 'warning.lighter' },
  critical: { color: 'error.main', bg: 'error.contrastText' },
};

export default function TaskTable({
  tasks,
  loading,
  isAdmin,
  handleOpenTaskDrawer,
  handleEditClick,
  handleDeleteClick,
  getStatusTranslation,
  getStatusColor,
}: TaskTableProps) {
  const t = useTranslations('tasks');
  const headers = [
    { key: "name", label: "name" },
    { key: "dueDate", label: "dueDate" },
    { key: "hours", label: "hours" },
    { key: "reportedBy", label: "reportedBy" },
    { key: "assignedTo", label: "assignedTo" },
    { key: "category", label: "category" },
    { key: "status", label: "status" },
    { key: "actions", label: "actions" }
  ]

  return (
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
      <Table stickyHeader sx={{ minWidth: 700 }} aria-label="task table">
        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
          <TableRow>
            {headers.map((header) => (
              <TableCell
                key={header.key}
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                {t(`table.headers.${header.label}`)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {t('table.state.loading')}
                </Typography>
              </TableCell>
            </TableRow>
          ) : tasks.length > 0 ? (
            tasks.map((task) => (
              <TableRow key={task.id} hover onClick={() => handleOpenTaskDrawer(task)} sx={{ cursor: "pointer" }}>
                {/* TASK NAME */}
                <TableCell sx={{ maxWidth: 220 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-center">
                    {task.priority && (
                      <Tooltip title={t(`create.form.priority.options.${task.priority}`)}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: PRIORITY_CONFIG[task.priority]?.color || 'text.secondary',
                          }}
                        >
                          <ErrorOutline fontSize="small" style={{ color: 'inherit' }} />
                        </Box>
                      </Tooltip>
                    )}
                    <Box sx={{ width: '100%' }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        }}
                      >
                        {task.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word',
                        }}
                      >
                        {task.project.name}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>

                {/* DUE DATE  */}
                <TableCell>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    color="text.secondary"
                  >
                    <CalendarToday sx={{ fontSize: 12 }} />
                    <Typography variant="caption">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                    </Typography>
                  </Stack>
                </TableCell>

                {/* EXPECTED HOURS */}
                <TableCell>{task.expected_hours}h</TableCell>

                {/* Reporter */}
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
                      <Typography variant="caption">{task?.reported_by?.name.charAt(0) || task?.reported_by?.email.charAt(0) }</Typography>
                    </Avatar>
                    <Typography variant="body2">{task.reported_by?.name || task.reported_by?.email}</Typography>
                  </Stack>
                </TableCell>

                {/* Assignee */}
                <TableCell>
                  <Box>
                    {task.assigned_to ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            fontWeight: 600,
                            width: 28,
                            height: 28,
                          }}
                        >
                          <Typography variant="caption">{task?.assigned_to?.name.charAt(0) || task?.assigned_to?.email.charAt(0)}</Typography>
                        </Avatar>
                        <Typography variant="body2">{task.assigned_to.name || task.assigned_to.email}</Typography>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: 'primary.secondary',
                            fontWeight: 600,
                            width: 28,
                            height: 28,
                          }}
                        >
                          {/* <Typography variant="caption">{t('noAssignee').[0]}</Typography> */}
                        </Avatar>

                        <Typography variant="caption" color="text.secondary">
                          {t('noAssignee')}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </TableCell>

                {/* CATEGORY */}
                <TableCell>
                  <Chip
                    label={t(`create.form.category.options.${task.category}`)}
                    size="small"
                    sx={{
                      borderRadius: 1.5,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                </TableCell>

                {/* STATUS */}
                <TableCell>
                  <Chip
                    label={getStatusTranslation(task.status)}
                    size="small"
                    color={getStatusColor(task.status) as any}
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      borderRadius: 1.5,
                      fontSize: 12,
                    }}
                  />
                </TableCell>

                {/* NEW ACTIONS CELL */}
                <TableCell align="right">
                  <Stack direction="row" spacing={1}>
                    <Tooltip title={t('tooltips.edit')}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(task);
                        }}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {isAdmin && (
                      <Tooltip title={t('tooltips.delete')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(task);
                          }}
                          sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          ) : (
            /* EMPTY STATE */
            <TableRow>
              <TableCell colSpan={headers.length} align="center" sx={{ py: 8 }}>
                <Typography color="text.secondary">{t('table.state.noTasks')}</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
