'use client';

import { useState, useMemo } from 'react';
import { 
  Box, Typography, Menu, MenuItem, Divider, Chip, 
  Stack, Skeleton, Avatar, ButtonBase, Tooltip 
} from '@mui/material';
import { UnfoldMore as SelectorIcon, Add as AddIcon, Check as CheckIcon } from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/_contexts/AuthContext';
import { orgSwitchApi } from '@/app/[locale]/(auth)/index';
import { useToast } from '@/app/_providers/ToastProvider';

export default function OrganisationSwitcher({ isCollapsed }: { isCollapsed: boolean }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { memberships, login } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const showToast = useToast();
  const t = useTranslations('dashboard.switcher');

  const open = Boolean(anchorEl);
  const locale = useMemo(() => pathname.split('/')[1], [pathname]);
  const activeOrg = useMemo(() => memberships?.find(o => o.is_current), [memberships]);

  const handleOrgSwitch = async (orgId: string) => {
    if (orgId === activeOrg?.organization_id) return setAnchorEl(null);
    try {
      const data = await orgSwitchApi({ organisation_id: orgId });
      if (data) {
        const { tokens, user_id, email, organisation, role, memberships, full_name, preferred_language } = data;

        login({
          user: data,
          user_id: user_id,
          email: email,
          role: role,
          full_name: full_name,
          preferred_language: preferred_language,
          tokens: tokens,
          organisation: organisation,
          memberships: memberships
        });

        showToast({ message: t('toast.success.message'), severity: 'success' });
        setAnchorEl(null);
        router.push(`/${locale}/dashboard`);
      }
    } catch (error) {
      showToast({ message: t('toast.error.defaultMessage'), severity: 'error' });
    }
  };

  if (!memberships || memberships.length === 0) return <Skeleton variant="rounded" height={52} sx={{ m: 1 }} />;

  const trigger = (
    <ButtonBase
      onClick={(e) => setAnchorEl(e.currentTarget)}
      sx={{
        width: '100%',
        p: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={isCollapsed ? 0 : 1.5} alignItems="center" sx={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <Avatar
          variant="rounded"
          sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.9rem', fontWeight: 700 }}
        >
          {activeOrg?.organization_name.charAt(0).toUpperCase()}
        </Avatar>

        {!isCollapsed && (
          <>
            <Box sx={{ flexGrow: 1, textAlign: 'left', minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                {t('currentOrganisation')}
              </Typography>
              <Typography variant="body2" fontWeight={700} noWrap>
                {activeOrg?.organization_name}
              </Typography>
            </Box>
            <SelectorIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
          </>
        )}
      </Stack>
    </ButtonBase>
  );

  return (
    <Box sx={{ p: isCollapsed ? 0.5 : 1 }}>
      {isCollapsed ? <Tooltip title={activeOrg?.organization_name || ""} placement="right">{trigger}</Tooltip> : trigger}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ elevation: 4, sx: { mt: 1.5, minWidth: 240, borderRadius: 2 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>{t('myOrganisations')}</Typography>
        </Box>
        {memberships.map((org) => (
          <MenuItem
            key={org.organization_id}
            onClick={() => handleOrgSwitch(org.organization_id)}
            selected={org.is_current}
            sx={{ py: 1, mx: 1, borderRadius: 1.5, gap: 2, justifyContent: 'space-between', }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar variant="rounded" sx={{ width: 24, height: 24, fontSize: 12 }}>{org.organization_name.charAt(0)}</Avatar>
              <Typography variant="body2" fontWeight={org.is_current ? 600 : 400}>
                {org.organization_name}
              </Typography>
            </Stack>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={t(`roles.${org.role}`)} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
              {org.is_current && <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />}
            </Stack>
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => router.push(`/${locale}/organisation/create`)} sx={{ mx: 1, borderRadius: 1.5, color: 'primary.main' }}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2" fontWeight={600}>{t('createOrganisation')}</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}