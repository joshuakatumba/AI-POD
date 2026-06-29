'use client';

import {
  Box, Drawer, Stack, Typography, IconButton, Divider, Button, Avatar, alpha, Chip,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Link as MuiLink, Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  EmailOutlined,
  PersonOutlined,
  LocationOnOutlined,
  CalendarToday,
  GroupOutlined,
  EditOutlined,
  DeleteOutline,
  ArticleOutlined
} from '@mui/icons-material';
import { AdminOrganisationMembershipType, AdminOrganisationType } from '@/_types/admin'; // Adjust path as needed
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

// Reusable TabPanel
function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface OrganisationDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  org: AdminOrganisationType | null;
  onEdit: (org: AdminOrganisationType) => void;
  onDelete: (org: AdminOrganisationType) => void;
  formatDate: (iso: string) => string;
}

/**
 * Reusable detail row for the drawer body
 */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      py={2}
      sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ color: 'text.secondary', display: 'flex', opacity: 0.7 }}>{icon}</Box>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: '', letterSpacing: 1 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function OrganisationDetailDrawer({
  open,
  onClose,
  org,
  onEdit,
  onDelete,
  formatDate,
}: OrganisationDetailDrawerProps) {
  const [tabValue, setTabValue] = useState(0);
  const memberHeaders = ['user', 'role', 'status'];
  const t = useTranslations('admin.organisations.drawer');
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Reset tab when drawer closes
  useEffect(() => {
    if (!open) setTabValue(0);
  }, [open, org]);

  if (!org) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 450 },
          border: 'none',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Header Area */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
            {t('title')}
          </Typography>
          <IconButton onClick={onClose} sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Scrollable Body */}
        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper' }}>
          <Stack spacing={4}>

            {/* Identity Section */}
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Avatar
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 900,
                  borderRadius: 3,
                  boxShadow: (theme) => `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                {org.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                  {org.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                  <Chip
                    label={org.is_active ? t('status.active') : t('status.inactive')}
                    size="small"
                    color={org.is_active ? 'success' : 'default'}
                    sx={{ fontWeight: 800, borderRadius: 1.5, height: 20, fontSize: 10 }}
                  />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {t('id')}: {org.reference?.toString() || 'N/A'}
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            {/* Information List */}
            <Box sx={{ bgcolor: alpha('#000', 0.02), p: 2, borderRadius: 3 }}>
              <DetailRow
                icon={<EmailOutlined fontSize="small" />}
                label={t('info.email')}
                value={org.email}
              />
              <DetailRow
                icon={<PersonOutlined fontSize="small" />}
                label={t('info.owner')}
                value={org.creator.display_name || org.creator.email}
              />
              <DetailRow
                icon={<LocationOnOutlined fontSize="small" />}
                label={t('info.country')}
                value={org.country}
              />
              <DetailRow
                icon={<CalendarToday fontSize="small" />}
                label={t('info.created')}
                value={formatDate(org.created_at)}
              />
              <DetailRow
                icon={<GroupOutlined fontSize="small" />}
                label={t('totalMembers')}
                value={String(org.member_count)}
              />
            </Box>

            {/* Description */}
            {org.description && (
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={800}>
                  {t('info.description')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                  {org.description}
                </Typography>
              </Box>
            )}


            {/* Tabs & Lists Section */}
            <Paper elevation={0} sx={{
              // borderRadius: 3, 
              // border: '1px solid', 
              // borderColor: 'divider', 
              overflow: 'hidden'
            }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
                  <Tab label={`${t('tabs.members')} (${org.memberships.length})`} icon={<GroupOutlined />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }} />
                  <Tab label={t('tabs.activity')} icon={<ArticleOutlined />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }} />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {memberHeaders.map((key) => (
                          <TableCell key={key} sx={{ fontWeight: 800, color: 'text.secondary', fontSize: 10, textTransform: 'uppercase' }}>
                            {t(`tabs.headers.${key}`)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {org.memberships.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                            <Typography variant="caption" color="text.secondary">{t('table.empty')}</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        org.memberships.slice(0, showAllMembers ? org.memberships.length : 5).map((member) => (
                          <TableRow key={member.id} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar sx={{ width: 25, height: 25, fontSize: 10, bgcolor: 'primary.main', textTransform: "uppercase" }}>{member.display_name?.charAt(0) || member.email.charAt(0)}</Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 100 }} lineHeight={1}>
                                    {member.display_name || member.email}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={t(`tabs.roles.${member.role}`)}
                                size="small"
                                color={member.role === 'admin' ? 'error' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 11 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={t(`status.${member.is_active ? 'active' : 'inactive'}`)}
                                size="small"
                                color={member.is_active ? 'success' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 11 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {org.memberships.length > 5 && (
                  <Box p={2} textAlign="center" sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                    <MuiLink component="button" onClick={() => setShowAllMembers((prev) => !prev)} underline="hover" variant="caption" fontWeight={800}>
                      {showAllMembers ? t('tabs.showLess') : t('tabs.viewAllMembers')}
                    </MuiLink>
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box textAlign="center" py={6}>
                  <ArticleOutlined sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.2, mb: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary">{t('tabs.activityComingSoon')}</Typography>
                </Box>
              </TabPanel>
            </Paper>



          </Stack>
        </Box>

        {/* Footer Actions - Sticky */}
        <Box
          sx={{
            p: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            gap: 2
          }}
        >
          <Button
            fullWidth
            variant="contained"
            startIcon={<EditOutlined />}
            onClick={() => onEdit(org)}
            sx={{
              borderRadius: 3,
              py: 1.5,
              fontWeight: 800,
              textTransform: 'none',
              boxShadow: 'none'
            }}
          >
            {t('buttons.edit')}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<DeleteOutline />}
            onClick={() => onDelete(org)}
            sx={{
              borderRadius: 3,
              py: 1.5,
              fontWeight: 800,
              textTransform: 'none',
              borderWidth: 2,
              '&:hover': { borderWidth: 2 }
            }}
          >
            {t('buttons.delete')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}