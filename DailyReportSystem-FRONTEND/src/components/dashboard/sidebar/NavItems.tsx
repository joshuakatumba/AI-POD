'use client';

import React, { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { List, ListItemButton, ListItemIcon, ListItemText, Collapse, Box, styled, Tooltip, alpha } from '@mui/material';

import {
  Folder as FolderIcon,
  Users as PeopleIcon,
  LayoutDashboard as LayoutDashboardIcon,
  BookOpen as BookOpenIcon,
  Settings as SettingsIcon,
  Building2 as BusinessIcon,
  Bot as BotIcon,
  UserCog as AdminUsersIcon
} from 'lucide-react';
import { ExpandLess, ExpandMore } from '@mui/icons-material';


const StyledNavItem = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  marginInline: theme.spacing(1),
  minHeight: 44,
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
  },
}));

interface NavItemConfig {
  key: string;
  labelKey: string;
  icon: React.ElementType;
  href?: string;
  children?: NavItemConfig[];
}

const NavEntry = ({ item, isCollapsed, depth = 0, onMobileClose }: { item: NavItemConfig; isCollapsed: boolean; depth?: number; onMobileClose?: () => void }) => {
  const t = useTranslations('dashboard.NavItems');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const hasChildren = Boolean(item.children && item.children.length > 0);
  const locale = pathname.split('/')[1];
  const itemFullPath = `/${locale}${item.href}`;
  const isActive = item.href
    ? hasChildren
      ? pathname === itemFullPath || pathname.startsWith(`${itemFullPath}/`)
      : pathname === itemFullPath
    : false;
  const label = t(item.labelKey);

  const handleClick = () => {
    if (hasChildren && !isCollapsed) setOpen(!open);
    else if (item.href) {
      router.push(`/${pathname.split('/')[1]}${item.href}`);
      if (onMobileClose) onMobileClose();
    }
  };

  const content = (
    <StyledNavItem
      selected={isActive}
      onClick={handleClick}
      sx={{
        // 1. Center the content when collapsed, otherwise indent by depth
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        // 2. Remove horizontal padding when collapsed to allow perfect centering
        px: isCollapsed ? 0 : 2,
        pl: isCollapsed ? 0 : depth * 3 + 2,
        // 3. Ensure a consistent height for the "Dock" look
        minHeight: 48,
      }}
    >
      <ListItemIcon
        sx={{
          // 4. Remove the default minWidth (usually 56px) which pushes icons to the left
          minWidth: isCollapsed ? 0 : 40,
          // 5. Ensure the icon itself is centered within its own box
          justifyContent: 'center',
          // 6. Color logic
          color: isActive ? 'primary.main' : 'inherit',
        }}
      >
        <item.icon fontSize="small" />
      </ListItemIcon>

      {!isCollapsed && (
        <>
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              noWrap: true
            }}
          />
          {hasChildren && (open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
        </>
      )}
    </StyledNavItem>
  );

  return (
    <>
      {isCollapsed ? (
        <Tooltip title={label} placement="right" arrow disableInteractive>
          {/* We wrap in a Box to ensure the Tooltip anchor works on the centered item */}
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {content}
          </Box>
        </Tooltip>
      ) : (
        content
      )}

      {hasChildren && !isCollapsed && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children!.map((child) => (
              <NavEntry key={child.key} item={child} isCollapsed={isCollapsed} depth={depth + 1} onMobileClose={onMobileClose} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export default function NavItems({ isCollapsed, isAdminMode, onMobileClose }: { isCollapsed: boolean; isAdminMode: boolean; onMobileClose?: () => void }) {
  const menuConfig: NavItemConfig[] = useMemo(() => {
    if (isAdminMode) {
      return [
        // --- ADMIN SPECIFIC ITEMS ---
        { key: 'dashboard', labelKey: 'admin-dashboard', icon: LayoutDashboardIcon, href: '/admin' },
        {
          key: 'admin-users',
          labelKey: 'users',
          icon: AdminUsersIcon,
          href: '/admin/users'
        },
        {
          key: 'admin-organizations',
          labelKey: 'organisations',
          icon: BusinessIcon,
          href: '/admin/organisations'
        },
        {
          key: 'admin-ai-config',
          labelKey: 'configuration',
          icon: BotIcon,
          href: '/admin/workflows'
        },
      ];
    }

    // --- CONSUMER / NORMAL MODE ITEMS ---
    return [
      { key: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboardIcon, href: '/dashboard' },

      // --- PROJECT MANAGEMENT ---
      {
        key: 'workspace',
        labelKey: 'projects',
        icon: FolderIcon,
        href: '/projects',
      },

      // --- TEAM & RESOURCES ---
      {
        key: 'team-management',
        labelKey: 'members',
        icon: PeopleIcon,
        href: '/organisation/members',
      },

      // --- ASSETS & KNOWLEDGE ---
      {
        key: 'reports',
        labelKey: 'reports',
        icon: BookOpenIcon,
        href: '/reports',
      },

      // --- ADMINISTRATION ---
      {
        key: 'settings-group',
        labelKey: 'settings',
        icon: SettingsIcon,
        href: '/settings'
        // children: [
        //   { key: 'general-settings', labelKey: 'general', icon: SettingsIcon, href: '/settings/general' },
        // ],
      },
    ];
  }, [isAdminMode]);

  return (
    <Box component="nav" sx={{ p: 1 }}>
      <List disablePadding>
        {menuConfig.map((item) => <NavEntry key={item.key} item={item} isCollapsed={isCollapsed} onMobileClose={onMobileClose} />)}
      </List>
    </Box>
  );
}