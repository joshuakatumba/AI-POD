'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Stack,
  Box,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import { DeleteOutline, EditOutlined, ManageAccounts, Person, Add as AddIcon } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/_contexts/AuthContext';
import EditOrganisationMemberModal from '@/components/modals/EditOrganisationMember';
import { InviteOrganisationMemberPayloadType, organisationMemberType, updateOrganisationMemberType } from '@/_types/organisation';
import {
  updateOrganisationMemberAPI,
  getOrganisationMembersAPI,
  deactivateOrganisationMemberAPI,
  inviteOrganisationMemberAPI
} from '@/app/[locale]/organisation/index';
import DeactivateOrganisationMemberModal from '@/components/modals/DeactivateMember';
import { useToast } from '@/app/_providers/ToastProvider';
import InviteOrganisationMemberModal from '@/components/organisation/modals/InviteOrganisationmember';

export default function MembersPage() {
  const t = useTranslations('organisation.Members');
  const m = useTranslations('modals.editOrganisationMember');
  const headerTitle = ['name', 'role', 'status', 'date'];
  const { organisation, user } = useAuth();
  const [organisationMembers, setOrganisationMembers] = useState<organisationMemberType[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const [currentUser, setCurrentUser] = useState<boolean>(false);

  /* -------- modal state -------- */
  const currentUserId = user?.user_id;
  const [selectedOrganisationMember, setSelectedOrganisationMember] =
    useState<organisationMemberType | null>(null);
  const [editOrganisationMember, setEditOrganisationMember] =
    useState<organisationMemberType | null>(null);

  const currentUserMembership = organisationMembers.find(
    (member) => member.user_id === user?.user_id
  );

  const isCurrentUserOrganisationAdmin = currentUserMembership?.role === 'admin';

  const tableHeaders = [...headerTitle, 'actions'];

  const [inviteModal, setInviteModal] = useState(false);
  const openInvite = () => setInviteModal(true);
  const closeInvite = () => setInviteModal(false);

  /* -------- fetch members -------- */

  const fetchMembers = async () => {
    if (!organisation) return;
    setLoading(true);
    getOrganisationMembersAPI(organisation)
      .then(setOrganisationMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [organisation]);

  const hasData = organisationMembers.length > 0;

  /* -------- handlers -------- */
  const openEdit = (member: organisationMemberType) => {
    setEditOrganisationMember(member);
    setCurrentUser(editOrganisationMember?.id === currentUserId);
  };

  const openDeactivate = (member: organisationMemberType) => setSelectedOrganisationMember(member);

  /* -------- check if user can edit this employee -------- */
  const canEdit = (member: organisationMemberType) => {
    if (member.status === 'inactive') return false;
    if (isCurrentUserOrganisationAdmin) return true;
    return member.id === currentUserId;
  };

  /* ---------------- Update Organisation Member Role ---------------- */
  const handleEdit = async (memberId: string, updates: updateOrganisationMemberType) => {
    if (!editOrganisationMember) {
      return;
    }

    try {
      const memberUpdates: updateOrganisationMemberType = {};
      if (updates.display_name !== editOrganisationMember.display_name) {
        memberUpdates.display_name = updates.display_name;
      }
      if (updates.role !== editOrganisationMember.role) {
        memberUpdates.role = updates.role;
      }
      if (Object.keys(memberUpdates).length === 0) {
        setEditOrganisationMember(null);
        return;

      }
      const data = await updateOrganisationMemberAPI(
        organisation,
        editOrganisationMember.id,
        memberUpdates
      );
      if (data) {
        setOrganisationMembers((prevMembers) =>
          prevMembers.map((mem) =>
            mem.id === editOrganisationMember.id
              ? {
                ...mem,
                display_name: data.display_name,
                role: data.role as organisationMemberType['role'],
              }
              : mem
          )
        );

        setEditOrganisationMember(null);
        showToast({
          message: m('toast.success.message'),
          severity: 'success',
        });
      }
    } catch (error) {
      showToast({
        message: m('toast.error.defaultMessage'),
        severity: 'error',
      });
    }
  };

  /* ---------------- Deactivate Organisation Member ---------------- */
  const handleDeactivateMember = async (memberId: string) => {
    if (!organisation) return;

    const member = organisationMembers.find((mem) => mem.id === memberId);
    if (!member?.id) return;
    try {
      const data = await deactivateOrganisationMemberAPI(organisation, member.id);

      if (data) {
        setOrganisationMembers((prevMembers) =>
          prevMembers.map((mem) =>
            mem.id === memberId
              ? {
                ...mem,
                status: "inactive",
              }
              : mem
          )
        );

        setSelectedOrganisationMember(null);
        showToast({ message: t('deactivatedSuccess'), severity: 'success', });
      }
    } catch (error) {
      showToast({ message: t('deactivateError'), severity: 'error', });
    }
  };

  /* ---------------- Invite Organisation Member ---------------- */
  const handleInvite = async (invitePayload: InviteOrganisationMemberPayloadType) => {
    try {
      const data = await inviteOrganisationMemberAPI(organisation, invitePayload);
      if (data) {
        setOrganisationMembers((prevMembers) => [
          {
            id: data.id,
            user_id: data.user_id,
            name: data.display_name,
            email: data.user_email,
            dateJoined: data.joined_at.split('T')[0],
            status: data.is_active ? "active" : "inactive",
            role: data.role,
          },
          ...prevMembers,
        ]);

        showToast({
          message: t('toast.invite.success.message'),
          severity: 'success',
        });
      }
    } catch (error) {
      showToast({
        message: t('toast.invite.error.defaultMessage'),
        severity: 'error',
      });
    }
  };
  /* -------- UI -------- */
  return (
    <div>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {t('title')}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            boxShadow: 0,
          }}
          onClick={openInvite}
          disabled={!isCurrentUserOrganisationAdmin}
        >
          {t('buttons.inviteMember')}
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto', maxHeight: 700 }}>
        <Table stickyHeader sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              {tableHeaders.filter(Boolean).map((headerTitle, index) => (
                <TableCell
                  key={headerTitle}
                  sx={{
                    color: 'text.primary',
                    fontWeight: 700,
                    borderBottom: '2px solid rgba(0,0,0,0.1)',
                    textAlign: index === tableHeaders.length - 1 ? 'right' : 'left'
                  }}
                >
                  {t(`table.${headerTitle}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {t('loadingMessage')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !hasData ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              organisationMembers.map((member) => (
                <TableRow
                  key={member.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  {/* NAME + AVATAR */}
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          fontWeight: 600,
                          width: 36,
                          height: 36,
                        }}
                      >
                        {member?.display_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {member.display_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* ROLE */}
                  <TableCell>
                    <Chip
                      size="small"
                      icon={
                        isCurrentUserOrganisationAdmin ? (
                          <ManageAccounts sx={{ fontSize: '1rem !important' }} />
                        ) : (
                          <Person sx={{ fontSize: '1rem !important' }} />
                        )
                      }
                      label={t(`roles.${member.role}`)}
                      color={member.role === 'admin' ? 'error' : 'default'}
                      sx={{ fontWeight: 600, borderRadius: 1 }}
                    />
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <Chip
                      size="small"
                      label={t(`status.${member.status}`)}
                      color={member.status === 'active' ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 1 }}
                    />
                  </TableCell>

                  {/* DATE */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {member.dateJoined}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        onClick={() => openEdit(member)}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                        disabled={!canEdit(member)}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openDeactivate(member)}
                        sx={{
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' },
                        }}
                        disabled={!canEdit(member)}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* -------- MODALS -------- */}
      <DeactivateOrganisationMemberModal
        open={!!selectedOrganisationMember}
        organisationMember={selectedOrganisationMember}
        onClose={() => setSelectedOrganisationMember(null)}
        onConfirm={handleDeactivateMember}
      />

      <EditOrganisationMemberModal
        open={!!editOrganisationMember}
        organisationMember={editOrganisationMember}
        onClose={() => setEditOrganisationMember(null)}
        onConfirm={handleEdit}
        isAdmin={isCurrentUserOrganisationAdmin}
        isCurrentUser={currentUserId === editOrganisationMember?.user_id}
      />

      {/* Invite Organisation Member Modal */}
      <InviteOrganisationMemberModal
        open={inviteModal}
        onClose={closeInvite}
        onConfirm={handleInvite}
      />
    </div>
  );
}