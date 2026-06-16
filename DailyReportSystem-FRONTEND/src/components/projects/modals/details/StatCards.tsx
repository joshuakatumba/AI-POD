import { useRouter } from 'next/navigation';
import { Box, Paper, Stack, Avatar, Typography, Chip, useTheme, alpha } from '@mui/material';
import {
  FormatListBulletedOutlined,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

interface StatsCardsProps {
  memberStats: {
    total: number;
    admins: number;
    contributors: number;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
  };
  reportsCount: {
    total: number;
    submitted: number;
  };
  worklogsCount: number;
  t: (key: string) => string;
  router: ReturnType<typeof useRouter>;
  locale: string;
  projectId: string;
}

export default function StatsCards({
  memberStats,
  taskStats,
  reportsCount,
  worklogsCount,
  t,
  router,
  locale,
  projectId,
}: StatsCardsProps) {
  const theme = useTheme();

  // Define allowed palette colors
  type PaletteColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

  // Helper function to safely get theme color
  const getPaletteColor = (color: string, shade: 'main' | 'light' | 'dark' = 'main') => {
    const validColors: PaletteColor[] = [
      'primary',
      'secondary',
      'error',
      'warning',
      'info',
      'success',
    ];

    if (validColors.includes(color as PaletteColor)) {
      return theme.palette[color as PaletteColor][shade];
    }

    // Fallback for default colors
    return theme.palette.primary.main;
  };

  // Helper function for alpha with theme colors
  const getAlphaColor = (
    color: string,
    opacity: number,
    shade: 'main' | 'light' | 'dark' = 'main'
  ) => {
    const baseColor = getPaletteColor(color, shade);
    return alpha(baseColor, opacity);
  };

  const handleCardClick = (path: string) => {
    if (path === '/reports') {
      router.push(`/${locale}/reports`);
      return;
    }
    router.push(`/${locale}/projects/${projectId}${path}`);
  };

  // Define card data array
  const cardsData = [
    {
      id: 'members',
      path: '/members',
      icon: GroupIcon,
      mainValue: memberStats.total,
      mainLabel: t('details.members.count') || 'Members',
      avatarColor: 'primary' as PaletteColor,
      chips: [
        {
          label: `${memberStats.contributors} ${t('details.members.contributors') || 'Contributors'}`,
          color: 'primary' as PaletteColor,
          condition: true,
        },
        {
          label: `${memberStats.admins} ${memberStats.admins === 1 ? t('details.members.roleAdmin') || 'Admin' : t('details.members.roleAdmin') || 'Admins'}`,
          color: 'primary' as PaletteColor,
          condition: memberStats.admins > 0,
        },
      ],
    },
    {
      id: 'tasks',
      path: '/tasks',
      icon: FormatListBulletedOutlined,
      mainValue: taskStats.total,
      mainLabel: t('details.stats.total') || 'Tasks',
      avatarColor: 'primary' as PaletteColor,
      chips: [
        {
          label: `${taskStats.completed} ${t('details.stats.completed') || 'Completed'}`,
          color: 'primary' as PaletteColor,
          condition: true,
        },
        {
          label: `${taskStats.inProgress} ${t('details.stats.inProgress') || 'In Progress'}`,
          color: 'primary' as PaletteColor,
          condition: taskStats.inProgress > 0,
        },
      ],
    },
    {
      id: 'reports',
      path: '/reports',
      icon: AssessmentIcon,
      mainValue: reportsCount.total,
      mainLabel: 'Reports',
      avatarColor: 'primary' as PaletteColor,
      chips: [
        {
          label: `${reportsCount.submitted} Submitted`,
          color: 'primary' as PaletteColor,
          condition: true,
        },
      ],
    },
    {
      id: 'worklogs',
      path: '/worklogs',
      icon: HistoryIcon,
      mainValue: worklogsCount,
      mainLabel: 'Worklogs',
      avatarColor: 'primary' as PaletteColor,
      chips: [
        {
          label: `${worklogsCount} Logged`,
          color: 'primary' as PaletteColor,
          condition: true,
        },
      ],
    },
  ];

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ width: '100%' }}>
        {cardsData.map((card) => {
          const IconComponent = card.icon;

          return (
            <Paper
              key={card.id}
              elevation={0}
              onClick={() => handleCardClick(card.path)}
              sx={{
                p: 4,
                flex: 1,
                borderRadius: 5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                position: 'relative',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  borderColor: getPaletteColor(card.avatarColor, 'main'),
                  boxShadow: `0 20px 40px ${getAlphaColor(card.avatarColor, 0.12)}`,
                  '& .icon-box': {
                    transform: 'scale(1.1) rotate(-5deg)',
                    bgcolor: getPaletteColor(card.avatarColor, 'main'),
                    color: 'white',
                  },
                },
              }}
            >
              <Stack spacing={3}>
                {/* Top Row: Oversized Icon & Main Value */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Avatar
                    className="icon-box"
                    sx={{
                      bgcolor: getAlphaColor(card.avatarColor, 0.1),
                      color: getPaletteColor(card.avatarColor, 'main'),
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <IconComponent sx={{ fontSize: 32 }} />
                  </Avatar>

                  {/* Value and Label Group */}
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-1px' }}>
                      {card.mainValue}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={800}
                      sx={{ textTransform: 'uppercase', opacity: 0.8 }}
                    >
                      {card.mainLabel}
                    </Typography>
                  </Box>
                </Stack>

                {/* Bottom Row: Dynamic Chips */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ pt: 1 }}
                >
                  {/* Chips Group */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {card.chips.map(
                      (chip, index) =>
                        chip.condition && (
                          <Chip
                            key={`${card.id}-chip-${index}`}
                            label={chip.label}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: '0.75rem',
                              bgcolor: getAlphaColor(chip.color, 0.08),
                              color: getPaletteColor(chip.color, 'main'),
                              fontWeight: 700,
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: getAlphaColor(chip.color, 0.1),
                            }}
                          />
                        )
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}