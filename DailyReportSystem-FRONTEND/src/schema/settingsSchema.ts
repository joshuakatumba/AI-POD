import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  preferred_language: z.enum(['en', 'ja', 'fr', 'es', 'de']), // Match LANGUAGE_CHOICES
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirm_password: z.string().min(8, 'Confirm password must be at least 8 characters long'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
