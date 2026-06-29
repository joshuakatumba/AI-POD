'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Avatar,
  Button,
  Stack,
  Divider,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ProjectRoleType } from '@/_types/organisation';
import { ProjectMemberType } from '@/_types/projectMembers';

type UpdateMemberRoleProps = {
  open: boolean;
  member: ProjectMemberType | null;
  onClose: () => void;
  onConfirm: (memberId: string, newRole: ProjectRoleType) => Promise<void>;
};

export default function UpdateProjectMemberModal({
  open,
  member,
  onClose,
  onConfirm,
}: UpdateMemberRoleProps) {
  const t = useTranslations('projectMembers.updateMemberRole');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProjectRoleType>(member?.role as ProjectRoleType || 'contributor');

  // Update selected role when member changes
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role as ProjectRoleType);
    }
  },[member, setSelectedRole]);

  const memberRoles = [
    { key: 'admin', label: t('roles.admin') },
    { key: 'contributor', label: t('roles.contributor') },
  ];

  const handleRoleChange = (event: SelectChangeEvent) => {
    setSelectedRole(event.target.value as ProjectRoleType);
  };

  const handleConfirm = async () => {
    if (!member) return;
    setLoading(true);
    try {
      await onConfirm(member.id, selectedRole);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 450 },
          maxWidth: 500,
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: 24,
        }}
      >
        {/* Header */}
        <Box px={3} py={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('title')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>
          {/* Member Info */}
          <Stack direction="row" spacing={3} alignItems="center" mb={3}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.lighter',
                color: 'primary.main',
                fontWeight: 600,
              }}
            >
              {member.member_name.charAt(0)}
            </Avatar>

            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>
                {member.member_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {member.member_email}
              </Typography>
            </Box>
          </Stack>

          {/* Role Selection */}
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            {t('selectNewRole')}
          </Typography>
          
          <FormControl fullWidth size="small">
            <Select
              value={selectedRole}
              onChange={handleRoleChange}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              {memberRoles.map((role) => (
                <MenuItem key={role.key} value={role.key}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2">{role.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography mt={3} variant="body2" color="text.secondary">
            {t('message')}
          </Typography>
        </Box>

        <Divider />

        {/* Actions */}
        <Box
          px={3}
          py={2}
          display="flex"
          flexDirection={{ xs: 'column-reverse', sm: 'row' }}
          gap={1.5}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            disabled={loading}
          >
            {t('buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            disabled={loading || selectedRole === member.role}
          >
            {loading ? t('updating') : t('buttons.update')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}