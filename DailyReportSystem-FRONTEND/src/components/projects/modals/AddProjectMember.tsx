'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Stack,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useToast } from '@/app/_providers/ToastProvider';
import { ProjectRoleType } from '@/_types/organisation';
import { useTranslations } from 'next-intl';
import { ProjectMemberType } from '@/_types/projectMembers';
import { useAuth } from '@/app/_contexts/AuthContext';
import { createProjectMemberApi } from '@/app/[locale]/projects/[project_id]/members';
import { CreateProjectMemberPayloadType } from '@/_types/projectMembers';

type AddProjectMemberModalProps = {
  open: boolean;
  onClose: () => void;
  onMemberAdded?: (newMember: ProjectMemberType) => void;
  setMembers?: React.Dispatch<React.SetStateAction<ProjectMemberType[]>>;
  projectId: string,
};

export default function AddProjectMemberModal({ open, onClose, setMembers, projectId }: AddProjectMemberModalProps) {
  const showToast = useToast();
  const t = useTranslations('projectMembers.addMember');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    role: '',
  });

  const initialMember: CreateProjectMemberPayloadType = {
    email: '',
    role: '',
  };

  const [newMember, setNewMember] = useState<CreateProjectMemberPayloadType>(initialMember);

  const memberRoles = [
    { key: 'admin', label: t('roles.admin') },
    { key: 'contributor', label: t('roles.contributor') },
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNewMember(initialMember);
      setErrors({ email: '', role: '' });
    }
  }, [open]);


  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      role: '',
    };
    let isValid = true;

    if (!newMember.email.trim()) {
      newErrors.email = t('validation.email.required');
      isValid = false;
    } else if (!validateEmail(newMember.email)) {
      newErrors.email = t('validation.email.invalid');
      isValid = false;
    }

    if (!newMember.role) {
      newErrors.role = t('validation.role.required');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddMember = async () => {
    setLoading(true);

    try {

      const payload = {
        email: newMember.email,
        role: newMember.role,
      }

      const data = await createProjectMemberApi(projectId, payload);

      if (data) {
        const projectMember: ProjectMemberType = {
          id: data.id,
          reference: data.reference,
          member_email: data.member_email,
          member_id: data.member_id,
          member_name: data.member_name,
          role: data.role,
          status: data.status,
          is_active: data.is_active,
          is_deleted: data.is_deleted
        }

        if (projectMember && setMembers) {
          setMembers((prev) => [...prev, projectMember]);
        }

        showToast({ message: t('toast.success.message'), severity: "success" });
        setLoading(false);
        handleClose();
      }

    } catch (error) {
      showToast({ message: t('toast.error.message'), severity: "error" });
      setLoading(false);
      return;
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setNewMember(initialMember);
      setErrors({ email: '', role: '' });
    }
  };

  const handleChange = (field: string, value: string) => {
    setNewMember({ ...newMember, [field]: value });
    // Clear error for this field when user types
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Form validation for button disable
  const isValid = newMember.email.trim() !== '' && validateEmail(newMember.email) && newMember.role !== '';

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 450 },
          maxWidth: 500,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {t('description')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ px: 3, py: 3 }}>
          <Stack spacing={3}>

            {/* Email Input */}
            <TextField
              fullWidth
              id="email"
              label={t('form.email.label')}
              placeholder={t('form.email.placeholder')}
              value={newMember.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              variant="outlined"
              size="small"
              disabled={loading}
              type="email"
              required
              autoFocus
            />

            {/* Role Select */}
            <FormControl fullWidth size="small" error={!!errors.role}>
              <InputLabel id="role-label">{t('form.role.placeholder')}</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                value={newMember.role}
                label={t('form.role.placeholder')}
                onChange={(e) => handleChange('role', e.target.value)}
                disabled={loading}
                required
              >
                <MenuItem value="" disabled>
                  <Typography color="text.secondary">{t('form.role.placeholder')}</Typography>
                </MenuItem>
                {memberRoles.map((role) => (
                  <MenuItem key={role.key} value={role.key}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.role && <FormHelperText error>{errors.role}</FormHelperText>}
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              onClick={handleClose}
              variant="outlined"
              color="inherit"
              disabled={loading}
            >
              {t('form.buttons.cancel')}
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={loading || !isValid}
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
            >
              {loading ? t('loading') : t('form.buttons.addMember')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
