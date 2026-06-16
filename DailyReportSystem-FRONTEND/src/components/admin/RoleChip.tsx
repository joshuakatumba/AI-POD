'use client';
import { Chip } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { useTranslations } from 'next-intl';

interface RoleChipProps {
  is_staff: boolean;
  is_superuser: boolean;
}

export default function RoleChip({ is_staff, is_superuser }: RoleChipProps) {
  const t = useTranslations('admin.users');
  const isAdmin = is_superuser;
  const role = is_superuser ? 'superuser' : is_staff ? 'staff' : 'member';

  return (
    <Chip
      size="small"
      icon={
        isAdmin || is_staff ? (
          <PeopleAltIcon sx={{ fontSize: '1rem !important', color: '#fff !important' }} />
        ) : (
          <PeopleAltIcon sx={{ fontSize: '1rem !important' }} />
        )
      }
      label={t(`roles.${role}`)}
      color={isAdmin ? 'error' : 'default'}
      sx={{
        fontWeight: 600,
        borderRadius: 1,
        ...(is_staff && !is_superuser && { bgcolor: '#4b7f44', color: '#fff' }),
      }}
    />
  );
}
