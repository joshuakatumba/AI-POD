'use client';

import { useToast } from "@/app/_providers/ToastProvider";
import ChatInterface from "@/components/chat/ChatInterface";
import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSessionByIdAPI } from "..";
import { SessionType } from "@/_types/chat";
import TaskRow from "@/components/chat/TaskRow";
import { Business, QueryBuilder } from "@mui/icons-material";

export default function ChatDetailsPage() {
  const t = useTranslations('chat');
  const showToast = useToast();
  const params = useParams();
  const sessionId = params?.session_id as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionType | null>(null);

  useEffect(() => {
    if (!sessionId) return
    fetchSessionData(sessionId);
  }, [sessionId]);

  const fetchSessionData = async (sessionId: string) => {
    try {
      setLoading(true);
      const sessionData = await getSessionByIdAPI(sessionId);
      setSession(sessionData)
    } catch (error) {
      showToast({ message: t('adminActions.fetchError'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return

  return (
    <Box sx={{ height: '100%' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ height: '93vh', p: 2 }}
      >
        {/* CHAT AREA SLOT - Left column */}
        <Paper
          elevation={0}
          sx={{
            flex: 2,
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          }}
        >
          <ChatInterface sessionId={sessionId} originalMessages={session.messages} modelName={session?.workflow_name} />
        </Paper>

        {/* Display Area - Right column */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            gap: 1.5,
            overflow: 'hidden',
            minHeight: 0,
            p: 2
          }}
        >
          {/* Top 50% */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: 2
          }}>
            {/* Top content */}
            <Paper elevation={0} >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    {session.reference}
                  </Typography>
                </Box>
                <Chip
                  label={t(`session.status.${session.status}`)}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box mt={0} pt={0}>
                <Typography variant="caption" display="block" color="text.secondary">
                  {t(`session.project`)}: <strong>{session.project_name}</strong>
                </Typography>
              </Box>
            </Paper>


          </Box>

          <Divider />


          {/* Bottom 50% */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              py: 2
            }}
          >
            {session.session_tasks.map((session_task) => (
              <TaskRow
                key={session_task.task.id}
                task={session_task.task}
                selected={false}
                checkable={true}
                onToggle={(ids) => console.log('Selected:', ids)}
              />
            ))}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}