import { TaskPriority } from '@/_types/task';

/**
 * Shared priority styling configuration.
 * Each entry maps a TaskPriority value to an MUI color palette key
 * and a translation label key.
 */
export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { color: string; labelKey: string }
> = {
  low: { color: 'success', labelKey: 'form.priority.options.low' },
  medium: { color: 'info', labelKey: 'form.priority.options.medium' },
  high: { color: 'warning', labelKey: 'form.priority.options.high' },
  critical: { color: 'error', labelKey: 'form.priority.options.critical' },
};
