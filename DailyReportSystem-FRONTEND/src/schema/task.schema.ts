import { z } from 'zod';
import { TASK_PRIORITIES, TASK_CATEGORIES } from '@/_types/task';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'validation.required').max(100, 'validation.maxLength'),
  description: z.string().max(500, 'validation.maxLength').optional(),
  status: z.enum([
    'backlog',
    'ready',
    'in_progress',
    'blocked',
    'review',
    'testing',
    'done',
    'deployed',
    'cancelled'
  ]),
  assignees: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z
    .number()
    .min(0, 'validation.min')
    .max(1000, 'validation.max')
    .optional(),
  priority: z.enum(TASK_PRIORITIES),
  category: z.enum(TASK_CATEGORIES)
});
