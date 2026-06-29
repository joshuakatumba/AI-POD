import { Button, Box, Divider, Tooltip, IconButton } from '@mui/material';
import { AdminPanelSettings, ExitToApp } from '@mui/icons-material'; // Professional icons
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';


interface AdminToggle {
  isAdminMode: boolean;
  isCollapsed: boolean;
}

export default function AdminToggle({ isAdminMode, isCollapsed }: AdminToggle) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('dashboard.switcher'); 

  const label = isAdminMode ? t("exitAdmin") : t("adminConsole");
  const Icon = isAdminMode ? ExitToApp : AdminPanelSettings;

  const adminStyles = isAdminMode ? {
    bgcolor: '#1a202c',
    color: '#fff',
    '&:hover': { bgcolor: '#2d3748' }
  } : {
    color: 'text.secondary',
    borderColor: 'divider',
    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
  };

  const handleSwitch = () => {
    // Navigate to the opposite app context
    const targetPath = isAdminMode ? `dashboard` : `admin`;
    router.push(`/${pathname.split('/')[1]}/${targetPath}`)
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      px: isCollapsed ? 0 : 2, // Remove horizontal padding when collapsed to center icon
      mt: 'auto',
      mb: 2
    }}>
      {isCollapsed ? (
        <Tooltip title={label} placement="right" arrow>
          <IconButton
            onClick={handleSwitch}
            sx={{
              borderRadius: '12px',
              border: isAdminMode ? 'none' : '1px solid',
              p: 1.5, // Adjust padding to match the visual weight of other icons
              ...adminStyles
            }}
          >
            <Icon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          fullWidth
          variant={isAdminMode ? "contained" : "outlined"}
          onClick={handleSwitch}
          startIcon={<Icon />}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.2,
            ...adminStyles
          }}
        >
          {label}
        </Button>
      )}
    </Box>
  );
};