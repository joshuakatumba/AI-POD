'use client';

import React, { useState, useEffect } from 'react';
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
  Stack,
  Box,
  Chip,
  Tooltip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  EditOutlined,
  DeleteOutlined,
  PeopleOutlined,
} from '@mui/icons-material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { useTranslations } from 'next-intl';
import { AdminUserType, DeactivateAdminUserPayloadType, UpdateAdminUserPayloadType } from '@/_types/admin';
import RoleChip from '@/components/admin/RoleChip';
import { useToast } from '@/app/_providers/ToastProvider';
import { getAdminUsersAPI, updateAdminUserAPI } from '@/app/[locale]/admin/users';
import AdminUpdateUser from '@/components/modals/admin/adminUpdateUser';
import DeactivateAdminUserModal from '@/components/modals/admin/adminUserDeactivate';
import ReactivateAdminUserModal from '@/components/modals/admin/adminUserReactivate';

// ---------- HELPERS ----------
function getAvatarLetter(email: string): string {
  return email[0]?.toUpperCase() ?? '';

}


// ---------- MAIN PAGE ----------
export default function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const showToast = useToast();

  const [users, setUsers] = useState<AdminUserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserType | null>(null);
  const [openDeactivateModal, setOpenDeactivateModal] = useState(false);
  const [selectedUserToDeactivate, setSelectedUserToDeactivate] = useState<AdminUserType | null>(null);
  const [openReactivateModal, setOpenReactivateModal] = useState(false);
  const [selectedUserToReactivate, setSelectedUserToReactivate] = useState<AdminUserType | null>(null);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const data = await getAdminUsersAPI();
      setUsers(data);
    } catch (err: any) {
      console.error(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateUser = async (userId: string, payload: UpdateAdminUserPayloadType) => {
    try {
      const updatedUser = await updateAdminUserAPI(userId, payload);
      setUsers((prevUsers: AdminUserType[]) =>
        prevUsers.map((user) =>
          user.id === userId
            ? { ...user, ...updatedUser }
            : user
        )
      );
      showToast({
        message: t('editModal.toast.success'),
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: t('editModal.toast.error'),
        severity: 'error',
      });
      throw error;
    }
  };

  const handleDeactivateUser = async (userId: string, payload: DeactivateAdminUserPayloadType) => {
  try {
    const deactivatedUser = await updateAdminUserAPI(userId, payload);
    setUsers((prevUsers: AdminUserType[]) =>
      prevUsers.map((user) => user.id === userId ? { ...user, ...deactivatedUser } : user)
    );
    showToast({
      message:t('deactivateModal.toast.success'),
      severity: 'success',
    });
  } catch (error) {
    showToast({
      message: t('deactivateModal.toast.error'),
      severity: 'error',
    });
  }
};

const handleReactivateUser = async (userId: string, payload: { is_active: boolean }) => {
  try {
    const reactivatedUser = await updateAdminUserAPI(userId, payload);
    setUsers((prevUsers: AdminUserType[]) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, ...reactivatedUser } : user
      )
    );
    showToast({
      message: t('reactivateModal.toast.success'),
      severity: 'success',
    });
  } catch (error) {
    showToast({
      message: t('reactivateModal.toast.error'),
      severity: 'error',
    });
  }
};

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const headers = [
    { key: "user", label: t('table.headers.user') },
    { key: "role", label: t('table.headers.role') },
    { key: "status", label: t('table.headers.status') },
    { key: "last_login", label: t('table.headers.last_login') },
    { key: "date_joined", label: t('table.headers.date_joined') },
    { key: "actions", label: t('table.headers.actions') },
  ];

  return (
    <Box>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{t('title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('subtitle')}</Typography>
        </Box>
      </Stack>

      {/* TABLE */}
      <TableContainer component={Paper} elevation={0} sx={{
        borderRadius: 2, overflowX: 'auto',
        border: (theme: { palette: { divider: any; }; }) => `1px solid ${theme.palette.divider}`,
        maxHeight: 600,
      }}>
        <Table stickyHeader sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header.key}
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  {header.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {t('table.state.loading')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((user: AdminUserType) => (
                <TableRow key={user.id} hover>

                  {/* USER */}
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700, width: 26, height: 26 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {getAvatarLetter(user.email)}
                        </Typography>
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {`${user.memberships.length} ${t('organisations', { count: user.memberships.length })}`}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* ROLE */}
                  <TableCell>
                    <RoleChip is_staff={user.is_staff} is_superuser={user.is_superuser} />
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <Chip
                      label={user.is_active ? t('status.active') : t('status.inactive')}
                      size="small"
                      color={user.is_active ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 12 }}
                    />
                  </TableCell>

                  {/* LAST LOGIN */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                      <Typography variant="caption">
                        {user.last_login
                          ? `${new Date(user.last_login).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })} ${new Date(user.last_login).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}`
                          : t('table.state.never')}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* DATE JOINED */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                      <CalendarTodayIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption">
                        {new Date(user.date_joined).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={ user.is_active ? t('table.tooltips.editUser') : t('table.tooltips.editUserDisabled')}>
                        <span>
                        <IconButton
                          size="small"
                          disabled={!user.is_active}
                          sx={{
                            bgcolor: user.is_active ? 'primary.main' : 'action.disabledBackground',
                            color: user.is_active ?  '#fff' : 'action.disabled',
                            width: 32,
                            height: 32,
                            '&:hover': { bgcolor: user.is_active ? 'primary.dark' : 'action.disabledBackground'},
                            '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                          }}
                          onClick={() => {
                            setSelectedUser(user);
                            setOpenEditModal(true);
                          }}
                        >
                          <EditOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={ user.is_active ? t('table.tooltips.deactivateUser') : t('table.tooltips.reactivateUser')}>
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: user.is_active ? 'error.main' : 'success.main',
                            color: '#fff',
                            width: 32,
                            height: 32,
                            '&:hover': { bgcolor: user.is_active ? 'error.dark' : 'success.dark' },
                          }}
                          onClick={() => {
                            if (user.is_active) {
                              setSelectedUserToDeactivate(user);
                              setOpenDeactivateModal(true);
                            } else {
                              setSelectedUserToReactivate(user);
                              setOpenReactivateModal(true);
                            }
                          }}
                        >
                          <DeleteOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>

                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length} align="center" sx={{ py: 6 }}>
                  <Stack spacing={1} alignItems="center">
                    <PeopleOutlined sx={{ fontSize: 30, color: 'text.disabled' }} />
                    <Typography color="text.secondary">{t('table.state.noUsers')}</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* ---------- MODAL ---------- */}
      <AdminUpdateUser
        open={openEditModal}
        user={selectedUser}
        onClose={() => setOpenEditModal(false)}
        onConfirm={handleUpdateUser}
      />
      <DeactivateAdminUserModal
        open={openDeactivateModal}
        user={selectedUserToDeactivate}
        onClose={() => setOpenDeactivateModal(false)}
        onConfirm={handleDeactivateUser}
      />
      <ReactivateAdminUserModal
        open={openReactivateModal}
        user={selectedUserToReactivate}
        onClose={() => setOpenReactivateModal(false)}
        onConfirm={handleReactivateUser}
      />
    </Box>
  );
}