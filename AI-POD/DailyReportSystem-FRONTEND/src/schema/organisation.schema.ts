import { z } from 'zod';

export const createOrganisationSchema = z.object({
  name: z.string().min(1, 'required'),
  type: z.string().min(1, 'required'),
  description: z.string().optional(),
  email: z.string().email('invalid'),
  country: z.string().optional(),
  inviteMembers: z.enum(['yes', 'no']).default('no'),
  inviteEmails: z.array(z.string().email('invalid')).optional(),
});

export type OrganisationFormInput = z.input<typeof createOrganisationSchema>;
export type OrganisationFormData = z.output<typeof createOrganisationSchema>;

// Helper function to validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
