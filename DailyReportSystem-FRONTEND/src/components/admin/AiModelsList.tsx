'use client';

import { Stack, Typography, Box, Button } from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';

import { useTranslations } from 'next-intl';
import { AiModelType, CreateAIModelPayloadType } from '@/_types/admin';
import AiModelCard from '@/components/admin/AiModelCard';
import { CloudOffIcon } from 'lucide-react';
import CreateAIModelModal from '@/components/admin/aiModels/createAiModelsModal';
import EditAIModelModal from '@/components/admin/aiModels/editAiModelModal';

import { useState } from 'react';
import DeleteAIModelModal from './aiModels/deleteAiModelModal';
import { useToast } from '@/app/_providers/ToastProvider';
import { createAiModelAPI, deleteAiModelAPI, updateAiModelAPI } from '@/app/[locale]/admin/workflows';


type AIModelListProps = {
  aiModels: AiModelType[];
  setAiModels: React.Dispatch<React.SetStateAction<AiModelType[]>>;
};

export default function AiModelsList({
  aiModels,
  setAiModels
}: AIModelListProps) {
  const t = useTranslations('admin.aiModels');
  const showToast = useToast();

  const [selectedModel, setSelectedModel] = useState<AiModelType | null>(null);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const handleCreateModalOpen = () => setOpenCreateModal(true);
  const handleCreateModalClose = () => setOpenCreateModal(false);

  const handleCreateAiModel = async (payload: CreateAIModelPayloadType) => {
    try {
      const newAiModel = await createAiModelAPI(payload);
      if (newAiModel) {
        setAiModels((prev) => [...prev, newAiModel]);
        handleCreateModalClose();
        showToast({
          message: t('toasts.create.success'),
          severity: 'success',
        })
      }
    } catch (err: any) {
      showToast({
        message: t('toasts.create.error'),
        severity: 'error',
      });
      throw err;
    }
    [handleCreateModalClose, showToast];
  };

  const handleEditModalClose = () => {
    setOpenEditModal(false);
    setSelectedModel(null);
  };

  const handleEditModalOpen = (model: AiModelType) => {
    setSelectedModel(model);
    setOpenEditModal(true);
  };

  const handleUpdateModel = async (modelId: string, data: any) => {
    try {
      const updatedAiModel = await updateAiModelAPI(modelId, data);

      if (updatedAiModel) {
        setAiModels((prev) =>
          prev.map((aiModel) =>
            aiModel.id === modelId
              ? {
                ...aiModel,
                ...updatedAiModel,
              }
              : aiModel
          )
        );
        handleEditModalClose();
        showToast({
          message: t('toasts.edit.success'),
          severity: 'success',
        });
      }
    } catch (err: any) {
      showToast({
        message: t('toasts.edit.error'),
        severity: 'error',
      });
    }
  };

  const handleDeleteModalClose = () => {
    setOpenDeleteModal(false);
    setSelectedModel(null);
  };

  const handleDeleteModalOpen = (model: AiModelType) => {
    setSelectedModel(model);
    setOpenDeleteModal(true);
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      const data = await deleteAiModelAPI(modelId);
      if (data) {
        setAiModels((prev) =>
          prev.map((aiModel) =>
            aiModel.id === modelId
              ? {
                ...aiModel,
                is_active: false,
              }
              : aiModel
          )
        );
      }
      handleDeleteModalClose();
      showToast({
        message: t('toasts.delete.success'),
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: t('toasts.delete.error'),
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Section Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-1px' }}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {t('subTitle')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            boxShadow: 0,
          }}
          onClick={handleCreateModalOpen}
        >
          {t('buttons.addAiModel')}
        </Button>

      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ width: '100%' }}>
        {aiModels.length > 0 ? (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ width: '100%' }}>
            {aiModels.map((model, index) => (
              <AiModelCard
                key={`${model.name}-${index}`}
                name={model.name} provider={model.provider}
                is_active={model.is_active}
                onEdit={() => handleEditModalOpen(model)}
                onDelete={() => handleDeleteModalOpen(model)}
              />
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              width: '100%',
              py: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              borderRadius: 4,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Box
              sx={{
                p: 2,
                mb: 2,
                borderRadius: '50%',
                bgcolor: 'background.paper',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                color: 'text.disabled'
              }}
            >
              <CloudOffIcon fontSize={40} />
            </Box>

            <Typography variant="h6" fontWeight="700" color="text.primary">
              {t('noModelsFound')}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
              {t('noAIProviders')}
            </Typography>
          </Box>
        )}
      </Stack>

      <CreateAIModelModal
        open={openCreateModal}
        onClose={handleCreateModalClose}
        onConfirm={handleCreateAiModel}
      />

      <EditAIModelModal
        open={openEditModal}
        model={selectedModel}
        onClose={handleEditModalClose}
        onConfirm={handleUpdateModel}
      />

      <DeleteAIModelModal
        open={openDeleteModal}
        model={selectedModel}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteModel}
      />
    </Box>
  );
}