import React from "react";
import { Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { TaskStatus } from "@/_types/task";

type KanbanColumnProps = {
  status: TaskStatus;
  children: React.ReactNode;
};

export default function KanbanColumn({
  status, children
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      status,
      type: "column",
    },
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minWidth: 320,
        width: 320,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        bgcolor: isOver ? "action.hover" : "background.paper",
        borderRadius: 2,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        p: 2,
        transition: "background-color 0.2s ease",
      }}
    >
      {children}
    </Box>
  );
};
