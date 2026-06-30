/**
 * Shared deadline / due-date utility.
 * Returns a human-readable label and a color string for use in MUI `sx` props.
 */

export interface DeadlineInfo {
  label: string;
  color: string;
  isOverdue: boolean;
}

export function getDeadlineInfo(dueDate?: string | null): DeadlineInfo {
  if (!dueDate) {
    return { label: '—', color: 'text.disabled', isOverdue: false };
  }

  const now = new Date();
  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return { label: '—', color: 'text.disabled', isOverdue: false };
  }

  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: overdueDays === 1 ? '1d overdue' : `${overdueDays}d overdue`,
      color: 'error.main',
      isOverdue: true,
    };
  }

  if (diffDays === 0) {
    return { label: 'Due today', color: 'warning.main', isOverdue: false };
  }

  if (diffDays === 1) {
    return { label: 'Tomorrow', color: 'warning.main', isOverdue: false };
  }

  if (diffDays <= 3) {
    return { label: `${diffDays}d left`, color: 'warning.main', isOverdue: false };
  }

  if (diffDays <= 7) {
    return { label: `${diffDays}d left`, color: 'info.main', isOverdue: false };
  }

  return {
    label: due.toLocaleDateString(),
    color: 'text.secondary',
    isOverdue: false,
  };
}
