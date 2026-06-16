'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  SearchOutlined,
  BusinessOutlined,
  GroupOutlined,
  CalendarToday,
  EditOutlined,
  DeleteOutline,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useToast } from '@/app/_providers/ToastProvider';
import DeleteOrganisationModal from '@/components/organisation/modals/DeleteOrganisation';
import EditOrganisationModal from '@/components/organisation/modals/EditOrganisation';
import { getAdminOrganisationsAPI, deleteOrganisationAPI, updateOrganisationAPI } from '@/app/[locale]/admin/organisations/index';
import { AdminEditOrganisationPayloadType, AdminOrganisationType } from '@/_types/admin';
import OrganisationDetailDrawer from '@/components/admin/OrganisationDetailDrawer';


// COMPONENT
export default function AdminOrganisationsPage() {
  const t = useTranslations('admin.organisations');
  const showToast = useToast();

  const [organisations, setOrganisations] = useState<AdminOrganisationType[]>([]);
  const [filtered, setFiltered] = useState<AdminOrganisationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // MODAL STATES
  const [deleteModal, setDeleteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganisationType | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // FETCH
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await getAdminOrganisationsAPI();
        setOrganisations(data);
        setFiltered(data);
      } catch (err) {
        console.error(err);
        showToast({ message: t('state.fetchError'), severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // FILTER
  useEffect(() => {
    let result = organisations;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.creator.display_name.toLowerCase().includes(q) ||
          o.creator.email.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.country.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((o) =>
        statusFilter === 'active' ? o.is_active : !o.is_active
      );
    }

    setFiltered(result);
  }, [search, statusFilter, organisations]);

  // MODAL HANDLERS
  const handleEdit = (org: AdminOrganisationType) => {
    setSelectedOrg(org);
    setEditModal(true);
  };

  const handleDelete = (org: AdminOrganisationType) => {
    setSelectedOrg(org);
    setDeleteModal(true);
  };


  const handleConfirmDelete = async (organization_id: string) => {
    await deleteOrganisationAPI(organization_id);
    setOrganisations((prev) => prev.filter((o) => o.id !== organization_id));
  };


  const handleConfirmEdit = async (id: string, payload: AdminEditOrganisationPayloadType) => {
    const updatedOrganisation = await updateOrganisationAPI(id, payload);
    setOrganisations((prev) =>
      prev.map((organization) => (organization.id === id ? { ...organization, ...updatedOrganisation } : organization))
    );
  };

  // 3. Handlers
  const handleOpenDetail = (org: AdminOrganisationType) => {
    setSelectedOrg(org);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    // Optional: Clear selection after transition ends
    setTimeout(() => setSelectedOrg(null), 300);
  };

  // HELPERS
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getStatusColor = (is_active: boolean) => is_active ? 'success' : 'default';

  const headers = ['organisation', 'country', 'owner', 'members', 'status', 'created', 'actions'];

  return (
    <Box>

      {/* PAGE HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
      </Stack>

      {/* FILTERS */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          size="small"
          placeholder={t('filters.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('filters.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('filters.status')}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">{t('filters.all')}</MenuItem>
            <MenuItem value="active">{t('status.active')}</MenuItem>
            <MenuItem value="inactive">{t('status.inactive')}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* TABLE */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          overflowX: 'auto',
        }}
      >
        <Table stickyHeader sx={{ minWidth: 700 }}>

          {/* HEAD */}
          <TableHead>
            <TableRow>
              {headers.map((key) => (
                <TableCell key={key} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {t(`table.headers.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* BODY */}
          <TableBody>

            {/* LOADING */}
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {t('state.loading')}
                  </Typography>
                </TableCell>
              </TableRow>

            ) : filtered.length === 0 ? (
              /* EMPTY */
              <TableRow>
                <TableCell colSpan={headers.length} align="center" sx={{ py: 8 }}>
                  <BusinessOutlined sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                  <Typography color="text.secondary">
                    {search || statusFilter !== 'all'
                      ? t('state.noResults')
                      : t('state.noOrganisations')}
                  </Typography>
                </TableCell>
              </TableRow>

            ) : (
              /* DATA ROWS */
              filtered.map((org) => (
                <TableRow
                  key={org.id}
                  onClick={() => handleOpenDetail(org)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selectedOrg?.id === org.id ? 'action.selected' : 'inherit',
                  }}
                  hover
                >

                  {/* ORGANISATION */}
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          borderRadius: 2,
                          width: 40,
                          height: 40,
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        {org.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {org.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={400}>
                          {org.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* COUNTRY */}
                  <TableCell>
                    <Typography variant="body2">{org.country}</Typography>
                  </TableCell>

                  {/* OWNER / CREATOR */}
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: 'primary.main',
                          fontSize: 16,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {(org.creator?.display_name ?? org.creator?.email ?? '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                          {/* {org.name} */}
                          {/* {org.creator?.name ?? '—'} */}
                          {org.creator?.display_name ?? org.creator?.email ?? '—'}
                        </Typography>
                        <Typography variant="body2" fontWeight={400} lineHeight={1.3}>
                          {/* {org.email} */}
                          {org.creator?.email ?? '—'}
                        </Typography>

                      </Box>
                    </Stack>
                  </TableCell>

                  {/* MEMBERS */}
                  <TableCell>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <GroupOutlined sx={{ fontSize: 18, color: 'text.secondary', display: 'flex' }} />
                      <Typography variant="body2" fontWeight={400} lineHeight={1}>
                        {org.member_count}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <Chip
                      label={t(`status.${org.is_active ? 'active' : 'inactive'}`)}
                      size="small"
                      color={getStatusColor(org.is_active) as any}
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 11 }}
                    />
                  </TableCell>

                  {/* CREATED */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <CalendarToday sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(org.created_at)}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={t('tooltips.edit')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(org);
                          }}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: 34,
                            height: 34,
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('tooltips.delete')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(org);
                          }}
                          sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: 34,
                            height: 34,
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* RESULT COUNT */}
      {!loading && filtered.length > 0 && (
        <Typography variant="caption" color="text.secondary" mt={2} display="block">
          {t('state.showing', { count: filtered.length, total: organisations.length })}
        </Typography>
      )}

      {/* MODALS */}
      <DeleteOrganisationModal
        open={deleteModal}
        organisation={selectedOrg}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />

      <EditOrganisationModal
        open={editModal}
        organisation={selectedOrg}
        onClose={() => setEditModal(false)}
        onConfirm={handleConfirmEdit}
      />

      <OrganisationDetailDrawer
        open={drawerOpen}
        onClose={handleClose}
        org={selectedOrg}
        formatDate={formatDate}
        onEdit={(org) => handleEdit(org)}
        onDelete={(org) => handleDelete(org)}
      />

    </Box>
  );
}