import { User } from '@/_types/auth';
import { ProjectResponseType } from '@/_types/project';
import { ProjectMemberType } from '@/_types/projectMembers';
import { FolderOutlined, EditOutlined, DeleteOutline } from '@mui/icons-material';
import { Stack, Avatar, Typography, Button, Box, Chip } from '@mui/material';
import PermissionTooltip from '@/components/PermissionTooltip';
import { DELETE_PROJECT_TOOLTIP, EDIT_PROJECT_TOOLTIP } from '@/constants/permissionMessages';


export default function HeaderHero({
  project,
  user,
  members = [],
  t,
  openEditProject,
  openDeleteModal,
}: {
  project: ProjectResponseType;
  user: User ;
  members?: ProjectMemberType[];
  getStatusTranslation: (status: string) => string;
  getStatusColor: (status: string) => string;
  t: (key: string) => string;
  openEditProject: () => void;
  openDeleteModal: () => void;
}) {

  const currentProjectMember = members?.find(
    (member) => member.member_id === user.membership
  );

  const isCurrentUserProjectAdmin = currentProjectMember?.role === 'admin';

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
            <Avatar
              sx={{
                bgcolor: 'primary.light',
                color: 'primary.main',
                borderRadius: 2,
                width: 48,
                height: 48,
              }}
            >
              <FolderOutlined fontSize="small" />
            </Avatar>
            <Box>
              {/* ── CHANGED: split into two rows so reference sits under the name ── */}

              {/* ROW 1: project name + reference chip side by side */}
              <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                <Typography variant="h5" fontWeight={800}>
                  {project?.name}
                </Typography>

                {/* ── NEW: reference chip ── */}
                {project?.reference && (
                  <Chip
                    label={project.reference}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: 'primary.main',
                      borderColor: 'primary.light',
                      bgcolor: 'primary.lighter',
                      height: 22,
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                )}
              </Stack>

              {/* ROW 2: owner text — moved to its own row below */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {t('details.info.owner') || 'Created by'}{' '}
                  <b>{project?.owner_name || 'Unknown'}</b>
                </Typography>
              </Stack>

            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <PermissionTooltip
            restricted={!isCurrentUserProjectAdmin}
            message={EDIT_PROJECT_TOOLTIP}
            ariaLabel={t('adminActions.edit') || 'Edit Project'}
          >
            <Button
              variant="outlined"
              startIcon={<EditOutlined />}
              onClick={openEditProject}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {t('adminActions.edit') || 'Edit Project'}
            </Button>
          </PermissionTooltip>
          <PermissionTooltip
            restricted={!isCurrentUserProjectAdmin}
            message={DELETE_PROJECT_TOOLTIP}
            ariaLabel={t('adminActions.delete') || 'Delete'}
          >
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={openDeleteModal}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            >
              {t('adminActions.delete') || 'Delete'}
            </Button>
          </PermissionTooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
