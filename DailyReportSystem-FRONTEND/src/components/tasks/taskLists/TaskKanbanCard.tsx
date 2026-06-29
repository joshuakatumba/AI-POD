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
<<<<<<< HEAD
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AttachFileIcon from "@mui/icons-material/AttachFile";

import { TaskResponseType } from "@/_types/task";
import { useTranslations } from "next-intl";
import { TaskPriority } from "@/_types/task";
import { PRIORITY_CONFIG } from "@/utils/priorityUtility";
import { getDeadlineInfo } from "@/utils/deadlineUtils";
=======

import { TaskResponseType } from "@/_types/task";
import { useTranslations } from "next-intl";
import { TaskCategory, TaskPriority } from "@/_types/task";

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; labelKey: string }> = {
  low: { color: 'success.main', labelKey: 'form.priority.options.low' },
  medium: { color: 'info.main', labelKey: 'form.priority.options.medium' },
  high: { color: 'warning.main', labelKey: 'form.priority.options.high' },
  critical: { color: 'error.main', labelKey: 'form.priority.options.critical' },
};
>>>>>>> origin/jm-commits

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

<<<<<<< HEAD
  /* ── ENH-4.1: Priority badge from shared utility ── */
  const priorityStyle = task.priority
    ? PRIORITY_CONFIG[task.priority as TaskPriority]
    : null;

  /* ── ENH-4.2: Live deadline countdown from shared utility ── */
  const deadline = getDeadlineInfo(task.due_date);
=======
  const formatDueDate = (date?: string | null) => {
    if (!date) return "No due date";

    return new Date(date).toLocaleDateString();
  }

  const getDueDateMeta = (date?: string | null) => {
    if (!date) {
      return {
        label: "No due date",
        borderColor: "divider",
      };
    }

    const today = new Date();
    const due = new Date(date);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diff =
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) {
      return {
        label: t("kanban.state.overdue"),
        borderColor: "error.main",
      };
    }

    if (diff === 0) {
      return {
        label: t("kanban.state.dueToday"),
        borderColor: "warning.main",
      };
    }

    return {
      label: formatDueDate(date),
      borderColor: "info.main",
    };
  }

  const dueDateMeta = getDueDateMeta(task.due_date);
  const priorityStyle = task.priority ? PRIORITY_CONFIG[task.priority as TaskPriority] : null;
>>>>>>> origin/jm-commits

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

<<<<<<< HEAD
          {/* HOURS + PRIORITY + STATUS */}
=======
          {/* HOURS + STATUS */}
>>>>>>> origin/jm-commits
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {task.expected_hours}h
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
<<<<<<< HEAD
              {/* ENH-4.1: Color-coded priority badge */}
              {task.priority && priorityStyle && (
                <Chip
                  label={t(`create.${priorityStyle.labelKey}`)}
                  size="small"
                  variant="filled"
                  color={priorityStyle.color as any}
=======
              {task.priority && priorityStyle && (
                <Chip
                  label={t(`create.form.priority.options.${task.priority}`)}
                  size="small"
                  variant="filled"
                  color={priorityStyle.color.split('.')[0] as any}
>>>>>>> origin/jm-commits
                  sx={(theme) => ({
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: alpha(
<<<<<<< HEAD
                      theme.palette[priorityStyle.color as "success"].main,
                      0.20
                    ),
                    color:
                      theme.palette[priorityStyle.color as "success"].main,
=======
                      theme.palette[priorityStyle.color.split(".")[0] as "success"].main,
                      0.20
                    ),
                    color:
                      theme.palette[
                        priorityStyle.color.split(".")[0] as "success"
                      ].main,
>>>>>>> origin/jm-commits
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
<<<<<<< HEAD
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
=======

          {/* ASSIGNEE + Dude Date */}
>>>>>>> origin/jm-commits
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            {/* ASSIGNEE */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
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

<<<<<<< HEAD
            {/* ENH-4.2: Live deadline countdown */}
            <Stack
              direction="row"
              spacing={0.5}
=======
            <Stack
              direction="row"
              spacing={1}
>>>>>>> origin/jm-commits
              alignItems="center"
            >
              <CalendarTodayIcon
                sx={{
                  fontSize: 14,
<<<<<<< HEAD
                  color: deadline.color,
=======
                  color: "text.secondary",
>>>>>>> origin/jm-commits
                }}
              />

              <Typography
                variant="caption"
<<<<<<< HEAD
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
=======
                color="text.secondary"
                fontWeight={600}
              >
                {dueDateMeta.label}
>>>>>>> origin/jm-commits
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}