import React from "react";
import {
  alpha,
  Avatar,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AttachFileIcon from "@mui/icons-material/AttachFile";

import { TaskResponseType, TaskPriority } from "@/_types/task";
import { useTranslations } from "next-intl";

const PRIORITY_CONFIG: Record<string, { color: string; labelKey: string }> = {
  low:      { color: 'success', labelKey: 'form.priority.options.low' },
  medium:   { color: 'info',    labelKey: 'form.priority.options.medium' },
  high:     { color: 'warning', labelKey: 'form.priority.options.high' },
  critical: { color: 'error',   labelKey: 'form.priority.options.critical' },
};

function getDeadlineInfo(dueDate?: string | null) {
  if (!dueDate) return { label: '—', color: 'text.disabled', isOverdue: false };
  const now = new Date();
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return { label: '—', color: 'text.disabled', isOverdue: false };
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`, color: 'error.main',    isOverdue: true  };
  if (diffDays === 0) return { label: 'Due today',                       color: 'warning.main',  isOverdue: false };
  if (diffDays === 1) return { label: 'Tomorrow',                        color: 'warning.main',  isOverdue: false };
  if (diffDays <= 7)  return { label: `${diffDays}d left`,               color: 'info.main',     isOverdue: false };
  return { label: due.toLocaleDateString(), color: 'text.secondary', isOverdue: false };
}

interface TaskKanbanCardProps {
  task: TaskResponseType;
  handleOpenTaskDrawer: (task: TaskResponseType) => void;
  getStatusTranslation: (status: string) => string;
  getStatusColor: (status: string) => string;
  noAssigneeText: string;
}

export default function TaskKanbanCard({
  task,
  handleOpenTaskDrawer,
  getStatusTranslation,
  getStatusColor,
  noAssigneeText,
}: TaskKanbanCardProps) {
  const t = useTranslations('tasks');

  const priorityStyle = task.priority
    ? PRIORITY_CONFIG[task.priority as TaskPriority]
    : null;

  const deadline = getDeadlineInfo(task.due_date);

  return (
    <Card
      onClick={() => handleOpenTaskDrawer(task)}
      sx={{
        cursor: "pointer",
        borderRadius: 2,
        boxShadow: 'none',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.25}>
          {/* PROJECT & CATEGORY HEADER ROW */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: "0.72rem",
                fontWeight: 500,
              }}
            >
              {task.project.name}
            </Typography>

            {task.category && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  bgcolor: "action.hover",
                  px: 1,
                  py: 0.25,
                  borderRadius: 5,
                }}
              >
                {t(`create.form.category.options.${task.category}`)}
              </Typography>
            )}
          </Stack>

          {/* TASK NAME */}
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.name}
          </Typography>

          {/* HOURS + PRIORITY + STATUS */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {task.expected_hours}h
            </Typography>

            <Stack direction="row" spacing={0.75} alignItems="center">
              {task.priority && priorityStyle && (
                <Chip
                  label={t(`create.${priorityStyle.labelKey}`)}
                  size="small"
                  variant="filled"
                  color={priorityStyle.color as any}
                  sx={(theme) => ({
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: alpha(
                      theme.palette[priorityStyle.color as "success"].main,
                      0.20
                    ),
                    color: theme.palette[priorityStyle.color as "success"].main,
                  })}
                />
              )}

              <Chip
                label={getStatusTranslation(task.status)}
                size="small"
                color={getStatusColor(task.status) as any}
                variant="outlined"
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            </Stack>
          </Stack>

          {/* ACTIVITY INDICATORS */}
          {((task.comments_count && task.comments_count > 0) ||
            (task.attachments_count && task.attachments_count > 0)) && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {task.comments_count ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" fontWeight={600}>{task.comments_count}</Typography>
                </Stack>
              ) : null}
              {task.attachments_count ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
                  <AttachFileIcon sx={{ fontSize: 14, transform: 'rotate(45deg)' }} />
                  <Typography variant="caption" fontWeight={600}>{task.attachments_count}</Typography>
                </Stack>
              ) : null}
            </Stack>
          )}

          {/* ASSIGNEE + DEADLINE */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {/* ASSIGNEE */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: "primary.main",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {task.assigned_to?.name?.charAt(0) || task.assigned_to?.email?.charAt(0) || "—"}
              </Avatar>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 100,
                }}
              >
                {task.assigned_to?.name || task.assigned_to?.email || noAssigneeText}
              </Typography>
            </Stack>

            {/* DEADLINE COUNTDOWN */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarTodayIcon
                sx={{
                  fontSize: 14,
                  color: deadline.color,
                }}
              />
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{
                  color: deadline.color,
                  ...(deadline.isOverdue && {
                    animation: "pulse 2s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.6 },
                    },
                  }),
                }}
              >
                {deadline.label}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}