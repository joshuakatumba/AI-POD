'use client'

import { useAuth } from "@/app/_contexts/AuthContext";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import React from 'react';
import {
  Box, Typography, Button, Avatar, AvatarGroup,
  Chip, LinearProgress, Stack, IconButton, alpha, useTheme,
  CircularProgress,
  Skeleton
} from '@mui/material';
import {
  AutoAwesomeRounded,
  LayersRounded,
  MoreHorizRounded,
  ArrowForwardRounded,
  NotificationsNoneRounded,
  SpeedRounded,
  CalendarToday
} from '@mui/icons-material';
import { getProjectsAPI } from "../projects";
import { ProjectResponseType } from "@/_types/project";
import { useToast } from "@/app/_providers/ToastProvider";
import { getReportsAPI } from "../reports";
import { ReportResponseType } from "@/_types/reports";
import { TaskResponseType } from "@/_types/task";
import { getAllTasksAPI } from "../projects/[project_id]/tasks";
import { applyTranslations } from "@/utils/taskTranslations";

export default function DashboardPage() {
  const t = useTranslations('dashboard.home');
  const { user, memberships } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const showToast = useToast();
  const selectedLanguage = pathname.split('/')[1] || 'en';
  const [loading, setLoading] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [activeProjects, setActiveProjects] = useState<ProjectResponseType[]>([]);
  const [reports, setReports] = useState<ReportResponseType[]>([]);
  const [tasks, setTasks] = useState<TaskResponseType[]>([]);

  useEffect(() => {
    if (!user) return;
    const current = memberships.find((m: any) => m.is_current);
    const displayName = current?.display_name || null;
    const preferredLanguage = current?.preferred_language || null;

    if (!displayName || !preferredLanguage) {
      router.push(`/${pathname.split('/')[1]}/profile`);
    }
  }, [user, memberships, router, pathname]);

  useEffect(() => {
    if (user) {
      fetchProjects(user.user_id);
      fetchReports(user.user_id);
      fetchTasks(user.user_id);
    }
  }, [user]);

  const fetchProjects = async (user_id: string) => {
    try {
      setProjectsLoading(true)
      const data = await getProjectsAPI({
        member_user_id: user_id,
      });
      setActiveProjects(data);
    } catch (err) {
      showToast({ message: t('table.state.fetchProjectsError'), severity: 'error' });
    } finally {
      setProjectsLoading(false)
    }
  };

  const fetchTasks = async (user_id: string) => {
    try {
      setTasksLoading(true)
      const data = await getAllTasksAPI({
        assigned_to: user_id,
        limit: 5,
      });

      const translatedTasks = data.map((task) =>
        applyTranslations(
          task,
          task.translations || [],
          selectedLanguage
        )
      );
      setTasks(translatedTasks);
    } catch (err) {
      showToast({ message: t('table.state.fetchTasksError'), severity: 'error' });
    } finally {
      setTasksLoading(false)
    }
  };

  const fetchReports = async (user_id: string) => {
    try {
      setReportsLoading(true)
      const data = await getReportsAPI({
        membership_user_id: user_id,
      });
      setReports(data);
    } catch (err) {
      showToast({ message: t('table.state.fetchReportsError'), severity: 'error' });
    } finally {
      setReportsLoading(false)
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'backlog':
        return 'default';
      case 'ready':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'blocked':
        return 'error';
      case 'review':
        return 'warning';
      case 'testing':
        return 'secondary';
      case 'done':
        return 'success';
      case 'deployed':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'closed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status.toLowerCase()) {
      case 'backlog':
        return t('table.status.backlog');
      case 'ready':
        return t('table.status.ready');
      case 'in_progress':
        return t('table.status.in_progress');
      case 'blocked':
        return t('table.status.blocked');
      case 'review':
        return t('table.status.review');
      case 'testing':
        return t('table.status.testing');
      case 'done':
        return t('table.status.done');
      case 'deployed':
        return t('table.status.deployed');
      case 'cancelled':
        return t('table.status.cancelled');
      case 'closed':
        return t('table.status.closed');
      default:
        return status;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', p: 3 }}>
      {/* Top Navigation / Greeting */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              {t("title")}
            </Typography>

          </Stack>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {t("subtitle")}
          </Typography>
        </Box>
      </Stack>

      {/* Main Layout Container */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
        gap: 4
      }}>

        {/* Left Column */}
        <Box sx={{ gridColumn: { lg: 'span 8' }, minWidth: 0 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LayersRounded sx={{ color: 'primary.main' }} /> {t("activeProjects.title")}
          </Typography>

          {/* Project Cards Horizontal Scroll */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              py: 2,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '6px' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'divider',
                borderRadius: '10px',
              },
            }}
          >
            {projectsLoading ? (
              [...Array(3)].map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    minWidth: { xs: '280px', md: '350px' },
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.divider, 0.1),
                    }}
                  >
                    <Stack spacing={2}>
                      <Skeleton variant="text" width="60%" height={32} />
                      <Skeleton variant="text" width="40%" height={20} />
                      <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 3 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width={80} height={28} />
                      </Stack>
                    </Stack>
                  </Box>
                </Box>
              ))
            ) : activeProjects.length === 0 ? (
              <Box
                sx={{
                  width: '100%',
                  py: 6,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.1),
                  borderRadius: 4,
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {t("activeProjects.empty.title")}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  {t("activeProjects.empty.description")}
                </Typography>
              </Box>
            ) : (
              activeProjects.map((project, idx) => {
                const progressData = project.progress_data || {};
                const totalTasks = Object.values(progressData).reduce((sum, val) => sum + (val ?? 0), 0);
                const completedTasks = (progressData.done ?? 0) + (progressData.deployed ?? 0) + (progressData.closed ?? 0);
                const activeTasksCount = totalTasks - completedTasks;
                const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return (
                  <Box
                    key={`${project.name}-${idx}`}
                    sx={{
                      minWidth: { xs: '280px', md: '350px' },
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, 0.1),
                        transition: '0.3s',
                        '&:hover': {
                          borderColor: getStatusColor(project.status),
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 3 }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {project.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                          >
                            {activeTasksCount} {t("activeProjects.activeTasks")}
                          </Typography>
                        </Box>

                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                          <MoreHorizRounded />
                        </IconButton>
                      </Stack>

                      <Box sx={{ mb: 3 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: 'text.primary' }}
                          >
                            {t("actions.progress")}
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {progressPercentage}%
                          </Typography>
                        </Stack>

                        <LinearProgress
                          variant="determinate"
                          value={progressPercentage}
                          aria-label={`${project.name} progress`}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.divider, 0.1),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getStatusColor(project.status),
                            },
                          }}
                        />
                      </Box>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <AvatarGroup
                          max={3}
                          sx={{
                            '& .MuiAvatar-root': {
                              width: 24,
                              height: 24,
                              fontSize: 12,
                              border: `2px solid ${theme.palette.background.paper}`,
                            },
                          }}
                        >
                          {project.members && Array.isArray(project.members) ? (
                            project.members.map((member) => (
                              <Avatar key={member.id} alt={member.member_name}>
                                {member.member_name ? member.member_name.charAt(0).toUpperCase() : ""}
                              </Avatar>
                            ))
                          ) : null}
                        </AvatarGroup>

                        <Button
                          variant="text"
                          size="small"
                          endIcon={<ArrowForwardRounded />}
                          sx={{
                            color: getStatusColor(project.status),
                            fontWeight: 700,
                            textTransform: 'none',
                          }}
                        >
                          {t("actions.open")}
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* Active Work Table */}
          <Box sx={{ mt: 5 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedRounded sx={{ color: 'primary.light' }} /> {t("recentTasks")}
              {/* <SpeedRounded sx={{ color: 'primary.light' }} /> {t('activeWork.title')} Recent Tasks */}
            </Typography>

            <Box sx={{
              borderRadius: 4,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.1),
              overflow: 'hidden'
            }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      {[
                        t("table.headers.task"),
                        t("table.headers.project"),
                        t("table.headers.status"),
                        t("table.headers.dueDate"),
                        t("table.headers.assignee"),
                        ""
                      ].map((head) => (
                        <Box component="th" key={head} sx={{ textAlign: 'left', p: 2, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                          {head}
                        </Box>
                      ))}
                    </Box>
                  </thead>
                  <tbody>
                    {loading ? (
                      <Box component="tr">
                        <Box component="td" colSpan={6} sx={{ p: 4, textAlign: 'center' }}>
                          <CircularProgress size={28} />
                        </Box>
                      </Box>
                    ) : tasks.length > 0 ? (
                      tasks.map((task) => (
                        <Box
                          component="tr"
                          key={task.id}
                          sx={{
                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.02) },
                            borderBottom: '1px solid',
                            borderColor: alpha(theme.palette.divider, 0.1)
                          }}
                        >
                          {/* TASK NAME & DESCRIPTION */}
                          <Box component="td"
                            sx={{ p: 2, maxWidth: 200 }}>
                            <Typography variant="body2"
                              sx={{
                                p: 2,
                                color: 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                wordBreak: 'break-word'
                              }}
                              fontWeight={600}>{task.name}</Typography>
                          </Box>

                          {/* PROJECT */}
                          <Box component="td" sx={{ p: 2 }}>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>{task.project.name}</Typography>
                          </Box>

                          {/* STATUS CHIP */}
                          <Box component="td" sx={{ p: 2 }}>
                            <Chip
                              label={getStatusTranslation(task.status)}
                              size="small"
                              color={getStatusColor(task.status) as any}
                              variant="outlined"
                              sx={{
                                fontWeight: 700,
                                borderRadius: 1.5,
                                fontSize: 12,
                              }}
                            />
                          </Box>

                          {/* DUE DATE */}
                          <Box component="td" sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                              <CalendarToday sx={{ fontSize: 14 }} />
                              <Typography variant="caption" fontWeight={500}>
                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                              </Typography>
                            </Stack>
                          </Box>

                          {/* ASSIGNEE */}
                          <Box component="td" sx={{ p: 2 }}>
                            {task.assigned_to ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                  {task.assigned_to.name.charAt(0)}
                                </Avatar>
                                <Typography variant="caption" fontWeight={600}>{task.assigned_to.name}</Typography>
                              </Stack>
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>{t("status.unassigned")}</Typography>
                            )}
                          </Box>


                          <Box component="td" sx={{ p: 2, textAlign: 'right' }}>
                            <IconButton size="small" sx={{ color: 'text.secondary' }}><ArrowForwardRounded fontSize="small" /></IconButton>
                          </Box>
                        </Box>
                      ))
                    ) : (
                      <Box component="tr">
                        <Box component="td" colSpan={6} sx={{ p: 8, textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('table.state.noTasks')}</Typography>
                        </Box>
                      </Box>
                    )}
                  </tbody>
                </Box>
              </Box>
            </Box>
          </Box>

        </Box>

        {/* Right Column */}
        <Box sx={{ gridColumn: { lg: 'span 4' }, minWidth: 0 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>{t("reports.pulseTitle")}</Typography>
          <Stack spacing={3}>
            <Box sx={{
              p: 3,
              borderRadius: 4,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: '1px solid',
              borderColor: 'divider',
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.light' }}><SpeedRounded /></Avatar>
                <Box>
                  <Typography variant="body2" sx={{ color: 'primary.light', fontWeight: 600 }}>{t("reports.workflowEfficiency")}</Typography>
                  <Typography variant="h5" fontWeight={800}>+12.5%</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ p: 3, borderRadius: 4, backdropFilter: 'blur(10px)', border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{t("reports.recentTitle")}</Typography>
                <Chip label={t("actions.autoSync")} size="small" sx={{ height: 20, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.light', fontSize: '10px' }} />
              </Stack>
              <Stack spacing={1.5}>
                {reportsLoading ? (
                  [...Array(4)].map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, 0.1),
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box>
                          <Skeleton variant="text" width={160} height={20} />
                          <Skeleton variant="text" width={220} height={16} />
                        </Box>
                      </Stack>
                      <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                  ))
                ) : reports.length === 0 ? (
                  <Box
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      borderRadius: 3,
                      // border: '1px solid',
                      borderColor: alpha(theme.palette.divider, 0.1),
                      bgcolor: alpha(theme.palette.background.default, 0.4),
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {t("reports.empty.title")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t("reports.empty.description")}
                    </Typography>
                  </Box>
                ) : (
                  reports.map((report) => (
                    <Box
                      key={report.id}
                      onClick={() => router.push(`/reports/${report.id}`)}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.default, 0.4),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        transition: '0.2s',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          borderColor: alpha(theme.palette.primary.main, 0.2),
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {report.project.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {report.created_at ? new Date(report.created_at).toLocaleDateString() : '-'} • {report.reference}
                          </Typography>
                        </Box>
                      </Stack>

                      <IconButton size="small" sx={{ color: 'text.disabled' }}>
                        <ArrowForwardRounded fontSize="inherit" />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Stack>
              <Button fullWidth onClick={() => router.push(`/${pathname.split('/')[1]}/reports`)} sx={{ mt: 3, color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem', '&:hover': { color: 'primary.main' } }}>
                {t("actions.browseArchive")}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}