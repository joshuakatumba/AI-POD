import type { OrganisationMembership, User } from '@/_types/auth';

/**
 * Mirrors backend `CanCreateOrganization`:
 * superusers may always create; users with any org membership role "member" may not.
 */
export function canUserCreateOrganisation(
  user: Pick<User, 'super_admin'> | null,
  memberships: Pick<OrganisationMembership, 'role'>[]
): boolean {
  if (!user) return false;
  if (user.super_admin) return true;
  return !memberships.some((membership) => membership.role === 'member');
}
