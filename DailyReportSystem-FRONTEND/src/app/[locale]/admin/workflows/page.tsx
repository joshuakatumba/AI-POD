'use client';

import { Box, Divider } from '@mui/material';
import { useTranslations } from 'next-intl';
import AiModelsList from '@/components/admin/AiModelsList';
import { AiModelType, WorkflowResponseType } from '@/_types/admin';
import AIWorkflowList from '@/components/admin/AiWorkflowList';
import { useState, useEffect } from 'react';
import { getAIModels, getAdminWorkflowsAPI } from '@/app/[locale]/admin/workflows';

export default function AIWorkflowPage() {
  const t = useTranslations('admin.workflows');

  const [modelsLoading, setModelsLoading] = useState(false);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiModels, setAiModels] = useState<AiModelType[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowResponseType[]>([]);

  const fetchAiModels = async () => {
    setModelsLoading(true);
    setError(null);
    try {
      const models = await getAIModels();
      setAiModels(models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI models');
    } finally {
      setModelsLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      setWorkflowsLoading(true);
      const data = await getAdminWorkflowsAPI();
      setWorkflows(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflows');
    } finally {
      setWorkflowsLoading(false);
    }
  };

  useEffect(() => {
    fetchAiModels();
    fetchWorkflows();
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Ai Models List */}
      <Box mb={5}>
        <AiModelsList aiModels={aiModels} setAiModels={setAiModels} />
      </Box>

      <Divider />

      {/* Ai Workflows List */}
      <Box mt={4}>
        <AIWorkflowList aiModels={aiModels} workflows={workflows} workflowsLoading={workflowsLoading} setWorkflows={setWorkflows}/>
      </Box>
    </Box>
  );
}