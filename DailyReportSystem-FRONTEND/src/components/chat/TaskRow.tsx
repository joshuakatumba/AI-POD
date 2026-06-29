import { Box, Typography, Stack, Avatar, Chip } from '@mui/material';
import { CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { TaskType } from '@/_types/task';
import { useTranslations } from 'next-intl';

// PROP TYPE
type TaskRowProps = {
  task: TaskType;
  selected: boolean;
  checkable: boolean;
  onToggle: (id: string) => void;
};

// HELPERS
const STATUS_COLORS: Record<string, string> = {
  backlog: 'default',
  ready: 'info',
  in_progress: 'primary',
  blocked: 'error',
  review: 'warning',
  testing: 'secondary',
  done: 'success',
  deployed: 'success',
  cancelled: 'default',
};


const getInitial = (name: string) => name?.charAt(0).toUpperCase() ?? '?';

export default function TaskRow({ task, selected, onToggle, checkable = true }: TaskRowProps) {
  const t = useTranslations('chat.taskSelection')
  const statusColor = STATUS_COLORS[task.status] ?? 'default';
  const assigneeName = task.assigned_to?.name ?? t('noAssignee');
  const projectName = task.project?.name ?? 'N/A';

  return (
    <Box
      onClick={() => onToggle(task.id)}
      sx={{
        px: 2,
        py: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: 'pointer',
        bgcolor: selected ? 'action.selected' : 'transparent',
        borderLeft: selected ? '2px solid' : '2px solid transparent',
        borderColor: selected ? 'primary.main' : 'transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: selected ? 'action.selected' : 'action.hover',
        },
      }}
    >
      {/* Checkbox icon */}
      {checkable && (
        <Box sx={{ color: selected ? 'primary.main' : 'text.disabled', display: 'flex', flexShrink: 0 }}>
          {selected
            ? <CheckBox sx={{ fontSize: 18 }} />
            : <CheckBoxOutlineBlank sx={{ fontSize: 18 }} />
          }
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: 13,
            fontWeight: selected ? 600 : 400,
            color: 'text.primary',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {task.name}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" mt={0.4}>
          <Avatar sx={{ width: 14, height: 14, fontSize: 8, fontWeight: 700, bgcolor: 'primary.main', color: '#fff' }}>
            {getInitial(assigneeName)}
          </Avatar>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            {assigneeName}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.disabled' }}>·</Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </Typography>
        </Stack>
      </Box>

      {/* Status chip */}
      <Chip
        label={t(`status.${task.status}`)}
        size="small"
        color={statusColor as any}
        variant="outlined"
        sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 11, flexShrink: 0 }}
      />
    </Box>
  );
}