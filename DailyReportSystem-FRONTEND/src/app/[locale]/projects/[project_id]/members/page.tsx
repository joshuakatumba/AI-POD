'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  Stack,
  IconButton,
  Chip,
  TableContainer,
  Button,
  CircularProgress,

} from '@mui/material';
import {
  DeleteOutline,
  EditOutlined,
  ManageAccounts,
  Person,
} from '@mui/icons-material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FormControl from '@mui/material/FormControl';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/app/_providers/ToastProvider';

import { ProjectRoleType } from '@/_types/organisation';
import { ProjectMemberType } from '@/_types/projectMembers';

import AddProjectMemberModal from '@/components/projects/modals/AddProjectMember';
import PermissionTooltip from '@/components/PermissionTooltip';
import {
  ADD_PROJECT_MEMBER_TOOLTIP,
  EDIT_PROJECT_MEMBER_TOOLTIP,
  INACTIVE_MEMBER_TOOLTIP,
  REMOVE_PROJECT_MEMBER_TOOLTIP,
} from '@/constants/permissionMessages';
import DeleteProjectMemberModal from '@/components/projects/modals/DeleteProjectMember';
import { deleteProjectMemberAPI } from '@/app/[locale]/projects/[project_id]/members/index';
import { boolean } from 'zod';
import { getProjectMembersAPI } from '@/app/[locale]/projects/[project_id]/members/index';
import UpdateProjectMemberModal from '@/components/projects/modals/UpdateProjectMemberModal';
import { updateProjectMemberAPI } from '@/app/[locale]/projects/[project_id]/members/index';
import { useAuth } from '@/app/_contexts/AuthContext';


export default function ProjectMembersPage() {
  const t = useTranslations('projectMembers');
  const params = useParams();
  const showToast = useToast();
  const { user } = useAuth()
  const projectId = params.project_id;

  const [members, setMembers] = useState<ProjectMemberType[]>([]);
  const [openAddMemberModal, setOpenAddMemberModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMemberType | null>(null)

  const currentProjectMember = members.find(
    member => member.member_id === user?.membership
  );

  const isCurrentUserProjectAdmin = currentProjectMember?.role === 'admin';

  const canEditMember = (member: ProjectMemberType) => {
    if (member.status === 'inactive') return false;
    if (isCurrentUserProjectAdmin) return true;         
  }

  const getProjectMemberEditRestrictionMessage = (member: ProjectMemberType) => {
    if (member.status === 'inactive') return INACTIVE_MEMBER_TOOLTIP;
    return EDIT_PROJECT_MEMBER_TOOLTIP;
  };

  const getProjectMemberRemoveRestrictionMessage = (member: ProjectMemberType) => {
    if (member.status === 'inactive') return INACTIVE_MEMBER_TOOLTIP;
    return REMOVE_PROJECT_MEMBER_TOOLTIP;
  };

  const [deleteModal, setDeleteModal] = useState(false);

  const openDeleteModal = (member: ProjectMemberType) => {
    setSelectedMember(member)
    setDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setDeleteModal(false);
    setSelectedMember(null);
  };

  const tableHeaders = [
    { key: 'member', label: t('table.member') },
    { key: 'role', label: t('table.role') },
    { key: 'status', label: t('table.status.label') },
    { key: 'actions', label: t('table.actions') },
  ];

  const memberRoles = [
    { key: 'admin', label: t('roles.admin') },
    { key: 'contributor', label: t('roles.contributor') },
  ]

  const fetchProjectMembers = async (projectId: string) => {
    try {
      setLoading(true);
      const data = await getProjectMembersAPI(projectId);
      setMembers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const normalizedProjectId = params.project_id as string;

  useEffect(() => {
    if (normalizedProjectId) {
      fetchProjectMembers(normalizedProjectId);
    }
  }, [normalizedProjectId]);

  const openEditModal = (member: ProjectMemberType) => {
    setSelectedMember(member)
    setOpenUpdateModal(true)
  }

  const closeUpdateModal = () => {
    setOpenUpdateModal(false);
    setSelectedMember(null);
  };

  const handleUpdateProjectMember = async (memberId: string, role: ProjectRoleType) => {
    try {
      const data = await updateProjectMemberAPI(normalizedProjectId, memberId, { role: role });

      if (data) {
        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId
              ? { ...member, role: data.role }
              : member
          )
        );

        showToast({
          message: t('toast.success.message'),
          severity: 'success',
        });
      }
    } catch (error) {
      showToast({
        message: t('toast.error.message'),
        severity: 'error',
      });
      throw error;
    }
  };

  const handleDeleteProjectMember = async (member_id: string) => {
    try {
      const data = await deleteProjectMemberAPI(normalizedProjectId, member_id);

      if (data) {
        setMembers((prev) =>
          prev.filter((member) =>
            member.id !== member_id
          )
        )
        closeDeleteModal();
        showToast({
          message: t('toast.delete.success.message'),
          severity: 'success',
        });
      };
    } catch (error) {
      showToast({
        message: t('toast.delete.error.message'),
        severity: 'error',
      });
    }
  };

  const handleAddMemberConfirm = (newMember: ProjectMemberType) => {
    setMembers((prev) => [...prev, newMember]);
    setOpenAddMemberModal(false);
    showToast({
      message: 'Member added successfully!',
      severity: 'success',
    });
  };

  return (
    <Box>
      {/* HEADER */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2} justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {t('title')}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
        <PermissionTooltip
          restricted={!isCurrentUserProjectAdmin}
          message={ADD_PROJECT_MEMBER_TOOLTIP}
          ariaLabel={t('buttons.addMember')}
        >
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setOpenAddMemberModal(true)}
          >
            {t('buttons.addMember')}
          </Button>
        </PermissionTooltip>

      </Stack>
      <AddProjectMemberModal
        open={openAddMemberModal}
        onClose={() => setOpenAddMemberModal(false)}
        onMemberAdded={handleAddMemberConfirm}
        setMembers={setMembers}
        projectId={normalizedProjectId}
      />
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          overflowX: 'auto',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          maxHeight: 600,
        }}
      >
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                {tableHeaders.map((header, index) => (
                  <TableCell key={header.key} sx={{ fontWeight: 800, textAlign: index === tableHeaders.length - 1 ? 'right' : 'left' }}>
                    {header.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={tableHeaders.length} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {t('table.state.loading')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <TableRow key={member.member_email}>
                    {/* NAME + AVATAR + EMAIL */}
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: "primary.main",
                            fontWeight: 600,
                            width: 36,
                            height: 36,
                          }}
                        >
                          <Typography variant="caption">{member.member_name?.charAt(0) || 'U'}</Typography>
                        </Avatar>

                        <Box>
                          <Typography fontWeight={700}>
                            {member.member_name}
                          </Typography>

                          <Typography
                            variant="caption"
                          >
                            {member.member_email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* ROLE DROPDOWN */}
                    <TableCell>
                        <Chip
                          size="small"
                          icon={
                            isCurrentUserProjectAdmin ? (
                              <ManageAccounts sx={{ fontSize: '1rem !important' }} />) : (
                              <Person sx={{ fontSize: '1rem !important' }} />
                            )
                          }
                          label={t('roles.' + member.role)}
                          color={member.role === 'admin' ? 'error' : 'default'}
                          sx={{ fontWeight: 600, borderRadius: 1 }}
                        />
                    </TableCell>
                    {/* STATUS  */}
                    <TableCell>
                      <Chip
                        size='small'
                        label={t('table.status.' + member.status.toLowerCase())}
                        color={member.status === 'active' ? 'success' : 'error'}
                        variant='outlined'
                        sx={{ fontWeight: 600, borderRadius: 1 }}
                      />
                    </TableCell>

                    {/* ACTION */}
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <PermissionTooltip
                          restricted={!canEditMember(member)}
                          message={getProjectMemberEditRestrictionMessage(member)}
                          ariaLabel={t('table.actions')}
                        >
                          <IconButton
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'primary.dark',
                              }
                            }}
                            size="small"
                            onClick={() => openEditModal(member)}
                          >
                            <EditOutlined />
                          </IconButton>
                        </PermissionTooltip>

                        <PermissionTooltip
                          restricted={!canEditMember(member)}
                          message={getProjectMemberRemoveRestrictionMessage(member)}
                          ariaLabel={t('table.actions')}
                        >
                          <IconButton
                            sx={{
                              bgcolor: 'error.main',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'error.dark',
                              }
                            }}
                            size="small"
                            onClick={() => openDeleteModal(member)}
                          >
                            <DeleteOutline />
                          </IconButton>
                        </PermissionTooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                /* EMPTY STATE */
                <TableRow>
                  <TableCell colSpan={tableHeaders.length} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">{t('table.state.noProjectMembers')}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <UpdateProjectMemberModal
          open={openUpdateModal}
          member={selectedMember}
          onClose={closeUpdateModal}
          onConfirm={handleUpdateProjectMember}
        />
        <DeleteProjectMemberModal
          open={deleteModal}
          member={selectedMember}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteProjectMember}
        />
      </TableContainer>
    </Box>
  );
}