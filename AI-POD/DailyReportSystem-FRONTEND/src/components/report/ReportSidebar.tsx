'use client';

import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
  Box,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Avatar,
  Button,
  alpha,
} from '@mui/material';
import {
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Search as SearchIcon,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { getProjectByIdAPI } from '@/app/[locale]/projects/index';
import { ProjectResponseType } from '@/_types/project';
import { ProjectMemberType } from '@/_types/projectMembers';
import { useTranslations } from 'next-intl';

type ReportSideBarProps = {
  selectedProjectId: string | null;
  projects: ProjectResponseType[];
  onProjectSelect: (id: string) => void;
  selectedMemberEmail: string | null;
  onMemberSelect: (email: string | null) => void;
};

export default function ReportSideBar({
  selectedProjectId,
  onProjectSelect,
  projects,
  selectedMemberEmail,
  onMemberSelect,
}: ReportSideBarProps) {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [members, setMembers] = useState<ProjectMemberType[]>([]);
  const [loading, setLoading] = useState({ projects: true, tasks: false, members: false });
  const [search, setSearch] = useState('');
  const [projectLimit, setProjectLimit] = useState(3);
  const [memberLimit, setMemberLimit] = useState(3);

  const t = useTranslations('report.sidebar');

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchMembers(selectedProjectId);
  }, [selectedProjectId]);

  const fetchMembers = async (projectId: string) => {
    try {
      setLoading((prev) => ({ ...prev, members: true }));

      const project = await getProjectByIdAPI(projectId);
      setMembers(project.members ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading((prev) => ({ ...prev, members: false }));
    }
  };

  const filteredProjects = projects.filter((p) =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const visibleProjects = filteredProjects.slice(0, projectLimit);
  const visibleMembers = members.slice(0, memberLimit);

  return (
    <Box sx={{ display: 'flex', height: '92vh', overflow: 'hidden' }}>
      <Box
        sx={{
          width: 280,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <DateCalendar
            value={selectedDate}
            onChange={(val) => val && setSelectedDate(val)}
            sx={{ width: '100%', height: 'auto' }}
            showDaysOutsideCurrentMonth 
            fixedWeekNumber={6}
          />
          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder={t('searchBar')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ fontSize: 20, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                bgcolor: alpha('#6366F1', 0.04),
                '& fieldset': { border: '1px solid', borderColor: 'divider' },
              },
            }}
            sx={{ p: 1.5 }}
          />
        </Box>

        <Box
          sx={{
            p: 1.5,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Projects */}
          <Typography variant="overline" fontWeight={700} color="text.secondary">
            {t('myProjects')}
          </Typography>
          <Stack
            spacing={0.5}
            mt={1}
            sx={{
              flexShrink: 0,
              maxHeight: '35%',
              overflowY: 'auto',
              mb: 1,
            }}
          >
            {visibleProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              return (
                <Stack
                  key={project.id}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  onClick={() => onProjectSelect(project.id)}
                  sx={{
                    p: 0.8,
                    cursor: 'pointer',
                    borderRadius: 2,
                    bgcolor: isSelected ? alpha('#6366F1', 0.08) : 'transparent',
                    '&:hover': { bgcolor: isSelected ? alpha('#6366F1', 0.12) : 'action.hover' },
                    transition: '0.2s',
                  }}
                >
                  <Box
                    sx={{ color: isSelected ? 'primary.main' : 'text.disabled', display: 'flex' }}
                  >
                    {isSelected ? (
                      <CheckBoxIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={isSelected ? 700 : 500} noWrap>
                    {project.name}
                  </Typography>
                </Stack>
              );
            })}

            {filteredProjects.length > 3 && (
              <Button
                size="small"
                startIcon={
                  projectLimit >= filteredProjects.length ? <ExpandLess /> : <ExpandMore />
                }
                onClick={() =>
                  setProjectLimit((prev) =>
                    prev >= filteredProjects.length ? 3 : filteredProjects.length
                  )
                }
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  alignSelf: 'flex-start',
                  color: 'text.secondary',
                }}
              >
                {projectLimit >= filteredProjects.length
                  ? t('showLess')
                  : `${t('show')} ${filteredProjects.length - 3} ${t('more')}`}
              </Button>
            )}
          </Stack>
          {/* Members */}
          {members.length > 0 && (
            <>
              <Typography variant="overline" fontWeight={700} color="text.secondary">
                {t('member')}
              </Typography>
              <Stack
                spacing={1.5}
                mt={1}
                mb={2}
                sx={{
                  flex: '1 1 0',
                  minHeight: 0,
                  overflowY: 'auto',
                }}
              >
                {visibleMembers.map((member: ProjectMemberType) => {
                  const isSelected = selectedMemberEmail === member.member_email;

                  return (
                    <Stack
                      key={member.member_email}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      onClick={() => {
                        if (!member.member_email) return;
                        onMemberSelect(isSelected ? null : member.member_email);
                      }}
                      sx={{
                        p: 0.8,
                        cursor: 'pointer',
                        borderRadius: 2,
                        bgcolor: isSelected ? alpha('#6366F1', 0.08) : 'transparent',
                        '&:hover': { bgcolor: alpha('#6366F1', 0.06) },
                        transition: '0.2s',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: isSelected
                            ? 'primary.main'
                            : member.is_active
                              ? 'primary.main'
                              : 'grey.400',
                          outline: isSelected ? '2px solid' : 'none',
                          outlineColor: 'primary.main',
                          outlineOffset: '2px',
                        }}
                      >
                        {member.member_name?.charAt(0).toUpperCase() || '?'}
                      </Avatar>

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          noWrap
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {member.member_name || member.member_email}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          display="block"
                        >
                          {member.role}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          color: isSelected ? 'primary.main' : 'text.disabled',
                          display: 'flex',
                        }}
                      >
                        {isSelected ? (
                          <CheckBoxIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />
                        )}
                      </Box>
                    </Stack>
                  );
                })}

                {members.length > 3 && (
                  <Button
                    size="small"
                    startIcon={memberLimit >= members.length ? <ExpandLess /> : <ExpandMore />}
                    onClick={() =>
                      setMemberLimit((prev) => (prev >= members.length ? 3 : members.length))
                    }
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      alignSelf: 'flex-start',
                      color: 'text.secondary',
                       mt: 0.5
                    }}
                  >
                    {memberLimit >= members.length
                      ? t('showLess')
                      : `${t('show')} ${members.length - 3} ${t('more')}`}
                  </Button>
                )}
              </Stack>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}