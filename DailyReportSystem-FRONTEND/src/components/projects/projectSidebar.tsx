import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Button,
  Divider,
  Stack,
  Avatar,
} from "@mui/material";
import { ExpandLess, ExpandMore, Add, FolderOutlined } from "@mui/icons-material";
import { ProjectResponseType } from "@/_types/project";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { getProjectsAPI } from "@/app/[locale]/projects";
import { useAuth } from "@/app/_contexts/AuthContext";


interface ProjectSidebarProps {
  onMobileClose?: () => void;
}

export default function projectSidebar({ onMobileClose }: ProjectSidebarProps = {}) {
  const t = useTranslations('projects.sidebar');
  const { user } = useAuth();
  const router = useRouter()
  const pathname = usePathname();

  const [projects, setProjects] = useState<ProjectResponseType[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const pathParts = pathname.split("/");
  const activeProjectId = pathParts[3];
  const activeTab = pathParts[4];

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjectsAPI();
      setProjects(data);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialState: Record<string, boolean> = {};

    projects.forEach((project: ProjectResponseType) => {
      initialState[project.id] = false;
    });

    setOpenMap(initialState);
  }, [projects]);

  useEffect(() => {
    const initialState: Record<string, boolean> = {};

    projects.forEach((project) => {
      initialState[project.id] = project.id === activeProjectId;
    });

    setOpenMap(initialState);
  }, [projects, activeProjectId]);

  const toggleProject = (id: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  const menuItems = [
    { label: t('nav.overview'), path: 'details' },
    { label: t('nav.tasks'), path: 'tasks' },
    { label: t('nav.members'), path: 'members' },
  ];

  return (
    <Box
      sx={{
        minHeight: `calc(100vh - 64px)`,
        width: { xs: '100%', md: 320 },
        display: "flex",
        flexDirection: "column",
        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
      }}
    >
      {/* Top Header */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          {t("allProjects")}
        </Typography>

        <TextField
          size="small"
          fullWidth
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mt: 2 }}
        />
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 1 }}>
        <List>
          {filteredProjects.map((project) => (
            <Box key={project.id}>
              <ListItemButton
                onClick={() => toggleProject(project.id)}
                sx={{
                  borderRadius: 1,
                  bgcolor: project.id === activeProjectId ? "action.selected" : "transparent",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>

                  <Avatar
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      borderRadius: 2,
                      width: 32,
                      height: 32,
                    }}
                  >
                    <FolderOutlined fontSize="small" />
                  </Avatar>

                  <ListItemText
                    primary={project.name}
                    sx={{ flex: 1 }}
                    slotProps={{
                      primary: {
                        variant: "subtitle2",
                        fontWeight: project.id === activeProjectId ? 600 : 400,
                        noWrap: true,
                      },
                    }}
                  />

                  {openMap[project.id] ? <ExpandLess /> : <ExpandMore />}
                </Stack>
              </ListItemButton>

              <Collapse in={openMap[project.id]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {menuItems.map((item) => {
                    const isActive =
                      activeProjectId === project.id && activeTab === item.path;

                    return (
                      <ListItemButton
                        key={item.path}
                        sx={{
                          pl: 4,
                          borderRadius: 1,
                          bgcolor: isActive ? "action.selected" : "transparent",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                        selected={isActive}
                        onClick={() => {
                          router.push(
                            `/${pathname.split("/")[1]}/projects/${project.id}/${item.path}`
                          );
                          if (onMobileClose) onMobileClose();
                        }}
                      >
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: {
                              variant: "subtitle2",
                              fontWeight: isActive ? 600 : 400,
                            },
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          ))}
        </List>
      </Box>

      {/* Bottom Action */}
      <Box sx={{ p: 2 }}>
      </Box>
    </Box>
  );
}