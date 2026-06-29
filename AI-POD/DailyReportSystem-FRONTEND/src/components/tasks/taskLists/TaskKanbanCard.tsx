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

import { TaskResponseType } from "@/_types/task";
import { useTranslations } from "next-intl";
import { TaskCategory, TaskPriority } from "@/_types/task";

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; labelKey: string }> = {
  low: { color: 'success.main', labelKey: 'form.priority.options.low' },
  medium: { color: 'info.main', labelKey: 'form.priority.options.medium' },
  high: { color: 'warning.main', labelKey: 'form.priority.options.high' },
  critical: { color: 'error.main', labelKey: 'form.priority.options.critical' },
};

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

          {/* HOURS + STATUS */}
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
              {task.priority && priorityStyle && (
                <Chip
                  label={t(`create.form.priority.options.${task.priority}`)}
                  size="small"
                  variant="filled"
                  color={priorityStyle.color.split('.')[0] as any}
                  sx={(theme) => ({
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: alpha(
                      theme.palette[priorityStyle.color.split(".")[0] as "success"].main,
                      0.20
                    ),
                    color:
                      theme.palette[
                        priorityStyle.color.split(".")[0] as "success"
                      ].main,
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

          {/* ASSIGNEE + Dude Date */}
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

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <CalendarTodayIcon
                sx={{
                  fontSize: 14,
                  color: "text.secondary",
                }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dueDateMeta.label}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}