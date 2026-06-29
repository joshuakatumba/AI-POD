'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Checkbox,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import { SearchOutlined, ForumOutlined } from '@mui/icons-material';
import TaskRow from '@/components/chat/TaskRow';
import SkeletonRow from '@/components/chat/SkeletonRow';
import { TaskType } from '@/_types/task';

type ReportTaskSelectionProps = {
  tasks: TaskType[];
  loading: boolean;
  onStartSession: (selectedTaskIds: string[]) => void;
};

// MAIN COMPONENT
export default function ReportTaskSelection({
  tasks,
  loading,
  onStartSession,
}: ReportTaskSelectionProps) {
  const t = useTranslations('chat.taskSelection');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isStarting, setIsStarting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(q) ||
        (task.assigned_to?.name ?? '').toLowerCase().includes(q) ||
        (task.project?.name ?? '').toLowerCase().includes(q) ||
        (task.due_date ? new Date(task.due_date).getFullYear().toString().includes(q) : false)
    );
  }, [search, tasks]);

  const toggleTask = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((task) => task.id));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const hasSelection = selectedIds.length > 0;

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      await onStartSession(selectedIds);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* HEADER */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography
            sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', letterSpacing: 0.2 }}
          >
            {t('title')}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>
          {t('subtitle')}
        </Typography>
      </Box>

      {/* SEARCH */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined sx={{ fontSize: 15, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            sx: {
              fontSize: 13,
              color: 'text.primary',
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'text.disabled' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
              '& input::placeholder': { color: 'text.disabled', fontSize: 12 },
            },
          }}
        />
      </Box>

      <Divider />

      {/* SELECT ALL ROW */}
      {!loading && tasks.length > 0 && (
        <Box
          onClick={selectAll}
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Checkbox
            checked={allSelected}
            indeterminate={hasSelection && !allSelected}
            size="small"
            sx={{
              p: 0,
              color: 'text.disabled',
              '&.Mui-checked': { color: 'primary.main' },
              '&.MuiCheckbox-indeterminate': { color: 'primary.main' },
            }}
          />
          <Typography
            sx={{
              fontSize: 11,
              color: 'text.secondary',
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {allSelected ? t('selectAll.deselectAll') : t('selectAll.selectAll')}
          </Typography>
          {hasSelection && (
            <Box sx={{ ml: 'auto' }}>
              <Typography sx={{ fontSize: 11, color: 'primary.main', fontWeight: 600 }}>
                {t('selectAll.selectedCount', { count: selectedIds.length })}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Divider />

      {/* TASK LIST */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
        }}
      >
        {/* LOADING */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          /* EMPTY */
          <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
            {search ? (
              <>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5 }}>
                  {t('empty.noResults', { search })}
                </Typography>
                <Typography
                  onClick={() => setSearch('')}
                  sx={{
                    fontSize: 12,
                    color: 'primary.main',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {t('empty.clearSearch')}
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                  {t('empty.noTasks')}
                </Typography>
              </>
            )}
          </Box>
        ) : (
          /* TASK ROWS */
          filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              checkable={true}
              selected={selectedIds.includes(task.id)}
              onToggle={toggleTask}
            />
          ))
        )}
      </Box>

      {/* FOOTER */}
      <Box sx={{ px: 2, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          disabled={!hasSelection || isStarting}
          onClick={handleStartSession}
          startIcon={
            isStarting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <ForumOutlined sx={{ fontSize: 16 }} />
            )
          }
          sx={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 1.5,
            py: 1.1,
            boxShadow: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              opacity: 0.6,
            },
          }}
        >
          {isStarting
            ? t('cta.loading')
            : hasSelection
              ? t('cta.active', { count: selectedIds.length })
              : t('cta.inactive')}
        </Button>
      </Box>
    </Box>
  );
}