import { User } from '@/_types/auth';
import { ProjectResponseType } from '@/_types/project';
import { ProjectMemberType } from '@/_types/projectMembers';
import { FolderOutlined, EditOutlined, DeleteOutline } from '@mui/icons-material';
import { Stack, Avatar, Typography, Button, Box } from '@mui/material';


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
              <Typography variant="h5" fontWeight={800}>
                {project?.name}
              </Typography>
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
          <>
            <Button
              variant="outlined"
              startIcon={<EditOutlined />}
              onClick={openEditProject}
              disabled={!isCurrentUserProjectAdmin}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {t('adminActions.edit') || 'Edit Project'}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={openDeleteModal}
              disabled={!isCurrentUserProjectAdmin}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            >
              {t('adminActions.delete') || 'Delete'}
            </Button>
          </>
        </Stack>
      </Stack>
    </Box>
  );
}