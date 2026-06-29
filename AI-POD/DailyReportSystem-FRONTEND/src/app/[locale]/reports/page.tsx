'use client';

import { useState, useEffect, useMemo } from 'react';
import dayjs, { Dayjs, locale } from 'dayjs';
import { Box, Typography, Stack, IconButton, alpha, Button, Collapse, Popover, Divider } from '@mui/material';
import { MenuOpen as SidebarIcon, ChevronLeft, ChevronRight, Close as CloseIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { getProjectsAPI } from '@/app/[locale]/projects/index';
import { ProjectResponseType } from '@/_types/project';
import { TaskResponseType } from '@/_types/task';
import ReportSideBar from '@/components/report/ReportSidebar';
import { useTranslations } from 'next-intl';
import { getReportsAPI } from '@/app/[locale]/reports/index';
import { ReportResponseType } from '@/_types/reports';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useParams, useRouter } from 'next/navigation';
import { applyTranslations } from '@/utils/reportTranslations';

const statusColors: Record<string, string> = {
  backlog: '#9CA3AF',
  ready: '#3B82F6',
  in_progress: '#2563EB',
  blocked: '#EF4444',
  review: '#F59E0B',
  testing: '#8B5CF6',
  done: '#10B981',
  deployed: '#10B981',
  cancelled: '#6B7280',
};

const MAX_REPORTS_VISIBLE = 5;
const REPORT_COLOR = '#6366F1';

export default function ReportsCalendar() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [projects, setProjects] = useState<ProjectResponseType[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskResponseType[]>([]);
  const [reports, setReports] = useState<ReportResponseType[]>([]);
  const [loading, setLoading] = useState({ projects: true, tasks: false });

  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const selectedLanguage = (params.locale as string) || 'en';

  const [popoverAnchor, setPopoverAnchor] = useState<{
    element: HTMLElement;
    date: Dayjs;
    reports: ReportResponseType[];
  } | null>(null);

  const t = useTranslations('report');

  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(null);

  const filteredTasks = selectedMemberEmail
    ? tasks.filter((task) => task.assigned_to?.id === selectedMemberEmail)
    : tasks;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading((prev) => ({ ...prev, projects: true }));

      const data = await getProjectsAPI();
      setProjects(data);

      if (!selectedProjectId && data[0]?.id) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
    } finally {
      setLoading((prev) => ({ ...prev, projects: false }));
    }
  };

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchReports(selectedProjectId, selectedDate.format('YYYY-MM'));
  }, [selectedProjectId, selectedDate, selectedLanguage]);

  const fetchReports = async (projectId: string, month: string) => {
    try {
      const data = await getReportsAPI({ project: projectId, month: month });

      const translatedReports = data.map((report) => 
        applyTranslations(
          report,
          (report as any).translations || [], 
          selectedLanguage
        )
      );
      setReports(translatedReports);
    } catch (error) {
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  };

  const calendarGrid = useMemo(() => {
    const startOfMonth = selectedDate.startOf('month');
    const startDayOfWeek = startOfMonth.day();
    const grid = [];
    for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
    for (let i = 1; i <= startOfMonth.daysInMonth(); i++) grid.push(i);
    while (grid.length < 42) grid.push(null);
    return grid;
  }, [selectedDate]);

  const daysOfTheWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) =>
    t(`daysOfWeek.${day}`)
  );

  const handleOpenPopover = (
    event: React.MouseEvent<HTMLElement>,
    date: Dayjs,
    dayReports: ReportResponseType[]
  ) => {
    event.stopPropagation();
    setPopoverAnchor({ element: event.currentTarget, date, reports: dayReports });
  };

  const handleClosePopover = () => setPopoverAnchor(null);

  const filteredReports = selectedMemberEmail
    ? reports.filter(
      (report) =>
        report.membership?.email?.toLowerCase().trim() ===
        selectedMemberEmail.toLowerCase().trim()
    )
  : reports;
  const handleViewReportDetails = (reportId: string) => {
    router.push(`/${locale}/reports/${reportId}`);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {/* SIDEBAR */}
        <Collapse orientation="horizontal" in={isSidebarOpen} sx={{ zIndex: 1, flexShrink: 0 }}>
          <ReportSideBar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            selectedMemberEmail={selectedMemberEmail}
            onMemberSelect={setSelectedMemberEmail}
          />
        </Collapse>

        {/* MAIN CALENDAR */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            Width: '100%',
            minWidth: 0,
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* TOP BAR */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={() => setSidebarOpen(!isSidebarOpen)}>
                <SidebarIcon />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 150 }}>
                {selectedDate.format('MMMM YYYY')}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                sx={{ borderRadius: 2, textTransform: 'none', ml: 2 }}
                onClick={() => setSelectedDate(dayjs())}
              >
                {t('today')}
              </Button>
              <IconButton
                size="small"
                onClick={() => setSelectedDate(selectedDate.subtract(1, 'month'))}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setSelectedDate(selectedDate.add(1, 'month'))}
              >
                <ChevronRight />
              </IconButton>
            </Stack>
          </Stack>

          {/* GRID LAYOUT */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              height: '100%',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {daysOfTheWeek.map((day) => (
              <Box
                key={day}
                sx={{
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <Typography variant="caption" fontWeight={800} color="text.disabled">
                  {day}
                </Typography>
              </Box>
            ))}

            {calendarGrid.map((day, id) => {
              const currentDay = day ? selectedDate.date(day) : null;
              const isToday = day === dayjs().date() && selectedDate.isSame(dayjs(), 'month');
              const dayTasks = filteredTasks.filter(
                (t) =>
                  t.due_date &&
                  dayjs(t.due_date).date() === day &&
                  dayjs(t.due_date).isSame(selectedDate, 'month')
              );

              const dayReports = filteredReports.filter(
                (r) =>
                  r.created_at && day && dayjs(r.created_at).isSame(selectedDate.date(day), 'day')
              );

              const visibleReports = dayReports.slice(0, MAX_REPORTS_VISIBLE);
              const remainingCount = dayReports.length - MAX_REPORTS_VISIBLE;

              return (
                <Box
                  key={id}
                  sx={{
                    p: 0.5,
                    border: '1px solid',
                    overflow: 'hidden',
                    borderColor: 'divider',

                    minHeight: { xs: 80, md: 120 },
                  }}
                >
                  {day && (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 0.5,
                          mx: 'auto',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          fontWeight: 700,
                          bgcolor: isToday ? 'primary.main' : 'transparent',
                          color: isToday ? 'white' : 'text.primary',
                        }}
                      >
                        {day}
                      </Typography>
                      <Stack spacing={0.2} mt={1}>
                        {dayTasks.map((task) => {
                          const normalizedStatus = task.status?.toLowerCase().replace(/\s+/g, '_');
                          const color = statusColors[normalizedStatus] ?? '#6366F1';
                          return (
                            <Box
                              key={task.id}
                              sx={{
                                px: 1,
                                py: 0.2,
                                borderRadius: '4px',
                                bgcolor: alpha(color, 0.1),
                                borderLeft: `3px solid ${color}`,
                                cursor: 'pointer',
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                noWrap
                                sx={{ display: 'block', fontSize: '11px', color }}
                              >
                                {task.name}
                              </Typography>
                            </Box>
                          );
                        })}

                        {visibleReports.map((report) => (
                          <Box
                            key={report.id}
                            onClick={() => {
                              handleViewReportDetails(report.id);
                            }}
                            sx={{
                              px: 1,
                              py: 0.2,
                              borderRadius: '4px',
                              bgcolor: alpha(REPORT_COLOR, 0.1),
                              borderLeft: `3px solid ${REPORT_COLOR}`,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'divider' },
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={800}
                              noWrap
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '10px',
                                color: REPORT_COLOR,
                              }}
                            >
                              <SummarizeIcon sx={{ fontSize: '11px', mr: 0.3 }} />
                              {report.reference}
                            </Typography>
                          </Box>
                        ))}

                        {remainingCount > 0 && (
                          <Button
                            size="small"
                            onClick={(e) =>
                              currentDay && handleOpenPopover(e, currentDay, dayReports)
                            }
                            sx={{
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'text.secondary',
                              p: 0,
                              mt: 0.5,
                              minWidth: 0,
                              '&:hover': { color: REPORT_COLOR },
                            }}
                          >
                            {`+ ${remainingCount} ` + t('more')}
                          </Button>
                        )}
                      </Stack>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* POPOVER */}
        <Popover
          open={Boolean(popoverAnchor)}
          anchorEl={popoverAnchor?.element}
          onClose={handleClosePopover}
          anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
          transformOrigin={{ vertical: 'center', horizontal: 'center' }}
          PaperProps={{
            sx: { width: 280, borderRadius: 3, boxShadow: '0px 8px 24px rgba(0,0,0,0.15)' },
          }}
        >
          {popoverAnchor && (
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ p: 2, pb: 1 }}
              >
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {popoverAnchor.date.format('ddd').toUpperCase()}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: -0.5 }}>
                    {popoverAnchor.date.format('D')}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={handleClosePopover}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Divider />
              <Stack spacing={0.5} sx={{ p: 2, maxHeight: 300, overflowY: 'auto' }}>
                {popoverAnchor.reports.map((report) => (
                  <Box
                    key={report.id}
                    onClick={() => {
                      handleViewReportDetails(report.id);
                    }}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: '4px',
                      bgcolor: alpha(REPORT_COLOR, 0.1),
                      borderLeft: `3px solid ${REPORT_COLOR}`,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'divider' },
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ display: 'flex', alignItems: 'center', color: REPORT_COLOR }}
                    >
                      <SummarizeIcon sx={{ fontSize: '12px', mr: 0.5 }} />
                      {report.reference}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Popover>
      </LocalizationProvider>
    </Box>
  );
}