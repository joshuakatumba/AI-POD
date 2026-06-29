import React, { useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  DndContext,
  DragEndEvent,
  pointerWithin,
  DragOverlay,
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { TaskResponseType, TaskStatus } from "@/_types/task";
import TaskKanbanCard from "./TaskKanbanCard";
import KanbanColumn from "@/components/tasks/Kanban/KanbanColumn";
import DraggableKanbanCard from "@/components/tasks/Kanban/DraggableKanbanCard";
import { updateTaskAPI } from "@/app/[locale]/projects/[project_id]/tasks";
import { useToast } from "@/app/_providers/ToastProvider";

interface TaskKanbanBoardProps {
  tasks: TaskResponseType[];
  handleOpenTaskDrawer: (task: TaskResponseType) => void;
  handleEditClick?: (task: TaskResponseType) => void;
  handleDeleteClick?: (task: TaskResponseType) => void;
  getStatusTranslation: (status: string) => string;
  getStatusColor: (status: string) => string;
}

const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "review",
  "testing",
  "done",
  "deployed",
  "cancelled",
];

export default function TaskKanbanBoard({
  tasks,
  handleOpenTaskDrawer,
  handleEditClick,
  handleDeleteClick,
  getStatusTranslation,
  getStatusColor,
}: TaskKanbanBoardProps) {
  const t = useTranslations("tasks");
  const showToast = useToast();
  const [activeTask, setActiveTask] = useState<TaskResponseType | null>(null);

  const buildGroupedTasks = (
    tasks: TaskResponseType[]
  ): Record<TaskStatus, TaskResponseType[]> => ({
    backlog: tasks.filter(t => t.status === "backlog"),
    ready: tasks.filter(t => t.status === "ready"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    blocked: tasks.filter(t => t.status === "blocked"),
    review: tasks.filter(t => t.status === "review"),
    testing: tasks.filter(t => t.status === "testing"),
    done: tasks.filter(t => t.status === "done"),
    deployed: tasks.filter(t => t.status === "deployed"),
    cancelled: tasks.filter(t => t.status === "cancelled"),
  });

  const [groupedTasks, setGroupedTasks] = React.useState<
    Record<TaskStatus, TaskResponseType[]>
  >(() => buildGroupedTasks(tasks));

  React.useEffect(() => {
    setGroupedTasks(buildGroupedTasks(tasks));
  }, [tasks]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;
    if (active.id === over.id) return;

    const activeTask = active.data.current?.task as TaskResponseType;
    if (!activeTask) return;

    const sourceStatus = activeTask.status as TaskStatus;

    const previousState = structuredClone(groupedTasks);

    const overData = over.data.current;
    const isOverColumn = overData?.type === "column";

    const destinationStatus = isOverColumn
      ? (over.id as TaskStatus)
      : (overData?.task?.status as TaskStatus);

    setGroupedTasks(prev => {
      const updated = { ...prev };

      const sourceTasks = [...updated[sourceStatus]];
      const sourceIndex = sourceTasks.findIndex(t => t.id === active.id);

      if (sourceIndex === -1) return prev;

      const [movedTask] = sourceTasks.splice(sourceIndex, 1);

      if (!movedTask) return prev;

      movedTask.status = destinationStatus;

      updated[sourceStatus] = sourceTasks;

      const destinationTasks = [...updated[destinationStatus]];

      const overIndex = isOverColumn
        ? destinationTasks.length
        : destinationTasks.findIndex(t => t.id === over.id);

      const safeIndex =
        overIndex === -1 ? destinationTasks.length : overIndex;

      destinationTasks.splice(safeIndex, 0, movedTask);

      updated[destinationStatus] = destinationTasks;

      return updated;
    });

    try {
      await updateTaskAPI(
        activeTask.project.id,
        activeTask.id,
        {
          status: destinationStatus,
        }
      );
      showToast({ message: t('toasts.drag.success'), severity: "success" });
    } catch (error) {
      showToast({ message: t('toasts.drag.error'), severity: "error" });
      setGroupedTasks(previousState);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => {
        setActiveTask(active.data.current?.task || null);
      }}
      onDragEnd={(event) => {
        handleDragEnd(event);
        setActiveTask(null);
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 7,
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
          height: "100%",

        }}
      >
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
          >
            {/* COLUMN HEADER */}
            <Stack spacing={1} mb={2} sx={{ flexShrink: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {t(`status.${status}`)}
                </Typography>

                <Chip
                  label={groupedTasks[status].length > 99 ? "99+" : groupedTasks[status].length}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>

            {/* TASKS */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",

                "&::-webkit-scrollbar": {
                  display: "none",
                },
              }}
            >
              <SortableContext
                items={groupedTasks[status].map(task => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={2}>
                  {groupedTasks[status].length > 0 ? (
                    groupedTasks[status].map((task) => (
                      <DraggableKanbanCard
                        key={task.id}
                        task={task}
                        handleOpenTaskDrawer={handleOpenTaskDrawer}
                        getStatusTranslation={getStatusTranslation}
                        getStatusColor={getStatusColor}
                        noAssigneeText={t("noAssignee")}
                      />
                    ))
                  ) : (
                    <Box
                      sx={{
                        py: 4,
                        textAlign: "center",
                        borderRadius: 2,
                        border: "1px dashed",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {t("table.state.noTasks")}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </SortableContext>
            </Box>
          </KanbanColumn>
        ))}
      </Box>

      <DragOverlay>
        {activeTask ? (
          <TaskKanbanCard
            task={activeTask}
            handleOpenTaskDrawer={handleOpenTaskDrawer}
            getStatusTranslation={getStatusTranslation}
            getStatusColor={getStatusColor}
            noAssigneeText={t("noAssignee")}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}