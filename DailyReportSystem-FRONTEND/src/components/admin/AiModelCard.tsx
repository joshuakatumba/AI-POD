import {
  Card,
  CardActionArea,
  Typography,
  Chip,
  Box,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import { useTranslations } from 'next-intl';
import { Delete, Edit, MoreVert } from '@mui/icons-material';
import { useState } from 'react';

type AiModelProps = {
  name: string;
  provider: string;
  is_active: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function AiModelCard({ name, provider, is_active, onEdit, onDelete }: AiModelProps) {
  const t = useTranslations('admin.aiModels.aiModelCard');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    console.log("Edit clicked");
    // Add your edit logic here (e.g., opening a modal)
    handleClose();
  };

  const handleDelete = () => {
    console.log("Delete clicked");
    // Add your delete logic here
    handleClose();
  };

  const MENU_OPTIONS = [
    {
      key: "edit-model",
      label: 'Edit Model',
      icon: <Edit fontSize="small" color="action" />,
      color: 'inherit'
    },
    {
      key: "delete-model",
      label: 'Delete Model',
      icon: <Delete fontSize="small" color="error" />,
      color: 'error.main'
    },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        width: 320,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: 'primary.light',
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)'
        }
      }}
    >
      <CardActionArea sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2.5} alignItems="center">

          {/* Refined Icon Container */}
          <Box
            sx={{
              display: 'flex',
              p: 1.5,
              borderRadius: '12px',
              bgcolor: is_active ? 'primary.main/0.12' : 'action.selected',
              color: is_active ? 'primary.main' : 'text.disabled',
              border: '1px solid',
              borderColor: is_active ? 'primary.100' : 'grey.200',
            }}
          >
            <MemoryIcon sx={{ fontSize: 28 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              fontWeight={700}
              noWrap
              sx={{ color: 'text.primary', letterSpacing: '-0.01em' }}
            >
              {name}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1.5,
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {provider}
            </Typography>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Chip
                label={is_active ? t('online') : t('offline')}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
              />

              <Box>

                <IconButton
                  component="div"
                  aria-label="more"
                  aria-controls={open ? 'long-menu' : undefined}
                  aria-expanded={open ? 'true' : undefined}
                  aria-haspopup="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(e);
                  }}
                  size="small"
                >
                  <MoreVert fontSize="small" />
                </IconButton>

                <Menu
                  id="long-menu"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{
                    paper: {
                      elevation: 0,
                      sx: {
                        width: 160,
                        mt: 1.5,
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
                        borderRadius: 1.5,
                        '&:before': {
                          content: '""',
                          display: 'block',
                          position: 'absolute',
                          top: 0,
                          right: 14,
                          width: 10,
                          height: 10,
                          bgcolor: 'background.paper',
                          transform: 'translateY(-50%) rotate(45deg)',
                          zIndex: 0,
                        },
                      },
                    },
                  }}
                >
                  {MENU_OPTIONS.map((option) => (
                    <MenuItem
                      key={option.key}
                      component="div"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Here you go", option.key)
                        if (option.key === 'edit-model') onEdit?.();
                        if (option.key === 'delete-model') onDelete?.();
                        handleClose();
                      }}
                      sx={{
                        py: 1,
                        px: 2,
                        gap: 1.5,
                        color: option.color,
                        '&:hover': {
                          bgcolor: option.key === 'delete' ? 'error.lighter' : 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        {option.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={option.label}
                        primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                      />
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
