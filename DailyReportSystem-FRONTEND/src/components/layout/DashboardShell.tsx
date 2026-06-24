'use client';

import React, { useMemo, useState } from 'react';
import {
  Box, AppBar, Toolbar, Container,
  styled, alpha, Breadcrumbs, Link, Typography, Stack,
  ContainerProps,
  keyframes,
  IconButton
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  HomeOutlined as HomeIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
import Sidebar from '@/components/dashboard/sidebar/Sidebar';
import { useTranslations } from 'next-intl';

const APPBAR_HEIGHT = 64;

const MainWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const MainContent = styled('main')({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
});

type LayoutConfig = {
  maxWidth: ContainerProps["maxWidth"];
  disableGutters: boolean;
  py: any; // or SxProps if you want to be strict
};

const layoutConfig: Record<DashboardMode, LayoutConfig> = {
  default: {
    maxWidth: "xl",
    disableGutters: false,
    py: { xs: 2, md: 5 },
  },
  chat: {
    maxWidth: false,
    disableGutters: true,
    py: 0,
  },
};

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

type DashboardMode = "default" | "chat";

interface DashboardShellProps {
  children: React.ReactNode;
  mode?: DashboardMode;
}

export default function DashboardShell({ children, mode = "default" }: DashboardShellProps) {
  const t = useTranslations('dashboard.NavItems');
  const pathname = usePathname();
  const router = useRouter();
  const config = layoutConfig[mode];
  const [mobileOpen, setMobileOpen] = useState(false);

  const locale = useMemo(() => pathname.split('/')[1], [pathname]);

  const breadcrumbs = useMemo(() => {
    const pathArray = pathname.split("/").filter(Boolean);

    // remove "en"
    const filteredPaths = pathArray.slice(1);

    // regex to detect UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // remove UUID segments
    const pathsWithoutUUIDs = filteredPaths.filter(
      (path) => !uuidRegex.test(path)
    );

    return pathsWithoutUUIDs.map((path, index) => {
      const href = `/${pathArray
        .slice(0, index + 2)
        .filter((p) => !uuidRegex.test(p))
        .join("/")}`;

      const labelKey = path
        .split("-")
        .map((word, i) =>
          i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join("");

      return {
        label: t(labelKey),
        href,
        isLast: index === pathsWithoutUUIDs.length - 1,
      };
    });
  }, [pathname, t]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <MainWrapper>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <MainContent>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            height: APPBAR_HEIGHT,
            backgroundColor: (theme) => alpha(theme.palette.background.default, 0.8),
            color: 'text.primary',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            zIndex: (theme) => theme.zIndex.drawer - 1,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2, md: 4 } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Breadcrumbs
                separator={<NextIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                aria-label="breadcrumb"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
              <Link
                underline="hover"
                onClick={() => router.push(`/${locale}/dashboard`)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <HomeIcon sx={{ fontSize: 20 }} />
              </Link>

              {breadcrumbs.map((crumb) => (
                crumb.isLast ? (
                  <Typography key={crumb.href} variant="body2" fontWeight={600}>
                    {crumb.label}
                  </Typography>
                ) : (
                  <Link
                    key={crumb.href}
                    underline="hover"
                    color="text.secondary"
                    variant="body2"
                    onClick={() => router.push(crumb.href)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {crumb.label}
                  </Link>
                )
              ))}
            </Breadcrumbs>
            </Stack>

            <Stack direction="row" spacing={0} alignItems="center">
              <LanguageToggle />
              <ThemeToggle />
            </Stack>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth={config.maxWidth}
          disableGutters={config.disableGutters}
          sx={{
            flexGrow: 1,
            py: config.py,
            height: mode === 'chat' ? '100%' : 'auto',
            animation: `${fadeInUp} 0.5s ease-out`,
          }}
        >
          {children}
        </Container>
      </MainContent>
    </MainWrapper>
  );
}