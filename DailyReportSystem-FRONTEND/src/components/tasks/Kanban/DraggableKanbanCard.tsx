import { TaskResponseType } from "@/_types/task";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box } from "@mui/material";
import { useTranslations } from "next-intl";
import TaskKanbanCard from "@/components/tasks/taskLists/TaskKanbanCard";

interface DraggableKanbanCardProps {
  task: TaskResponseType;
  handleOpenTaskDrawer: (task: TaskResponseType) => void;
  getStatusTranslation: (status: string) => string;
  getStatusColor: (status: string) => string;
  noAssigneeText: string;
}

export default function DraggableKanbanCard({
  task,
  handleOpenTaskDrawer,
  getStatusTranslation,
  getStatusColor,
  noAssigneeText,
}: DraggableKanbanCardProps) {
  const t = useTranslations("tasks");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      task,
      status: task.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    willChange: "transform",
    touchAction: "none",
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => handleOpenTaskDrawer(task)}
    >
      <TaskKanbanCard
        task={task}
        handleOpenTaskDrawer={handleOpenTaskDrawer}
        getStatusTranslation={getStatusTranslation}
        getStatusColor={getStatusColor}
        noAssigneeText={t("noAssignee")}
      />
    </Box>
  );
}