'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Box, Typography, IconButton, Stack } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/_contexts/AuthContext';
import { updateOrganisationMemberAPI } from '@/app/[locale]/organisation/index';
import { useToast } from '@/app/_providers/ToastProvider';
import { usePathname, useRouter } from 'next/navigation';
import {
  persistLocale,
  resolveLocale,
  toSupportedLocale,
} from '@/utils/localePreference';
import  ProfileBody  from '@/components/profile/ProfileBody';
import  ProfileFooter  from '@/components/profile/ProfileFooter';

interface ProfileDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDetailsDrawer({ open, onClose }: ProfileDetailsDrawerProps) {
  const t = useTranslations('dashboard.profile.details');
  const router = useRouter();
  const pathname = usePathname();
  const { user, memberships, setMemberships } = useAuth();
  const showToast = useToast();

  const [isEditing, setIsEditing] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('');

  const handleCloseDrawer = () => {
    setIsEditing(false);
    onClose();
  };

  useEffect(() => {
    if (memberships) {
      const current = memberships.find((m) => m.is_current);
      const name = current?.display_name ?? '';
      const lang = current?.preferred_language ?? '';
      setDisplayName(name);
      setPreferredLanguage(lang);
      setOriginalName(name);
      setOriginalLanguage(lang);
    }
  }, [memberships]);

  const currentMembership = memberships?.find((m) => m.is_current);
  const email = user?.email ?? '';
  const role = currentMembership?.role ?? '';
  const reference = user?.user_id ?? '';

  const handleCancel = () => {
    setDisplayName(originalName);
    setPreferredLanguage(originalLanguage);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setLoading(true);
    try {
      const data = await updateOrganisationMemberAPI(
        user.organisation,
        user.membership,
        { display_name: displayName, preferred_language: preferredLanguage }
      );

      if (data) {
        setMemberships((prev) =>
          prev.map((m) =>
            m.id === user.membership
              ? { ...m, display_name: displayName, preferred_language: preferredLanguage }
              : m
          )
        );

        showToast({ message: t('toast.success'), severity: 'success' });
        onClose();

        const pathLocale = resolveLocale(pathname.split('/')[1] ?? null);
        const preferredLocale = toSupportedLocale(preferredLanguage);
        const nextLocale = preferredLocale ?? pathLocale;
        persistLocale(nextLocale, { setOverride: true });

        if (nextLocale !== pathname.split('/')[1]) {
          router.push(`/${nextLocale}/dashboard`);
        }
      }
    } catch {
      showToast({ message: t('toast.error'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleCloseDrawer}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 420 }, borderRadius: '16px 0 0 16px' },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          px={3}
          py={2.5}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            {t('editTitle')}
          </Typography>
          <IconButton
            size="small"
            onClick={handleCloseDrawer}
            sx={{ bgcolor: 'action.hover', borderRadius: 2 }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Stack>

        {/* Body */}
        <ProfileBody
          isEditing={isEditing}
          displayName={displayName}
          preferredLanguage={preferredLanguage}
          email={email}
          role={role}
          reference={reference}
          onDisplayNameChange={setDisplayName}
          onLanguageChange={setPreferredLanguage}
          onSubmit={handleSubmit}
        />

        {/* Footer */}
        <ProfileFooter 
          loading={loading}
          displayName={displayName}
          preferredLanguage={preferredLanguage}
          onCancel={handleCancel}
        />
      </Box>
    </Drawer>
  );
}
