'use client';

import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Stack, Paper, Typography, Container, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { MessageType, SessionMessageType } from '@/_types/chat';

interface MessageBubbleProps {
  messages: (MessageType | SessionMessageType)[];
  isTyping: boolean;
}

export default function MessageBubble({
  messages,
  isTyping,
}: MessageBubbleProps) {
  const t = useTranslations('chat.chatBox');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isTyping]);

  return (
    <AnimatePresence mode="wait">
      {messages.length > 0 && (
        <Box
          ref={scrollRef}
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          sx={{ flexGrow: 1, overflowY: 'auto', py: 4 }}
        >
          <Container maxWidth="md">
            <Stack spacing={2}>
              {messages.map((msg) => {
                // Normalize text BEFORE rendering
                const normalizedText =
                  msg.content
                    ?.replace(/\\\\n/g, '\n')
                    .replace(/\\n/g, '\n') ?? '';

                if (msg.role === 'system') return;

                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      justifyContent:
                        msg.role === 'user'
                          ? 'flex-end'
                          : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Paper
                      component={motion.div}
                      elevation={0}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      sx={{
                        p: 2,
                        maxWidth: '85%',
                        borderRadius: 3,
                        bgcolor:
                          msg.role === 'user'
                            ? alpha('#6366F1', 0.1)
                            : alpha('#F3F4F6', 0),
                        color: 'text.primary',

                        '& p': {
                          mb: 1,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                        },
                        '& p:last-of-type': {
                          mb: 0,
                        },

                        '& ul, & ol': {
                          pl: 3,
                          my: 1,
                        },

                        '& li': {
                          mb: 0.5,
                        },

                        '& pre': {
                          p: 1.5,
                          borderRadius: 2,
                          overflowX: 'auto',
                          bgcolor: '#111827',
                          color: '#F9FAFB',
                          fontSize: '0.85rem',
                        },

                        '& code': {
                          bgcolor: alpha('#000', 0.05),
                          px: 0.5,
                          py: 0.2,
                          borderRadius: 1,
                          fontSize: '0.85rem',
                        },

                        '& h1, & h2, & h3': {
                          mt: 1.5,
                          mb: 1,
                          fontWeight: 600,
                        },
                      }}
                    >
                      {msg.role === 'user' ? (
                        <Typography
                          variant="body1"
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {normalizedText}
                        </Typography>
                      ) : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <Typography variant="body1">
                                {children}
                              </Typography>
                            ),

                            li: ({ children }) => (
                              <Typography component="li" variant="body1">
                                {children}
                              </Typography>
                            ),

                            strong: ({ children }) => (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: 700,
                                  color: '#4F46E5',
                                }}
                              >
                                {children}
                              </Box>
                            ),

                            h1: ({ children }) => (
                              <Typography variant="h5" fontWeight={700}>
                                {children}
                              </Typography>
                            ),

                            h2: ({ children }) => (
                              <Typography variant="h6" fontWeight={700}>
                                {children}
                              </Typography>
                            ),

                            h3: ({ children }) => (
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                              >
                                {children}
                              </Typography>
                            ),

                            code({ inline, children, ...props }: any) {
                              return inline ? (
                                <Box component="code" {...props}>
                                  {children}
                                </Box>
                              ) : (
                                <Box component="pre" {...props}>
                                  <code>{children}</code>
                                </Box>
                              );
                            },
                          }}
                        >
                          {normalizedText}
                        </ReactMarkdown>
                      )}
                    </Paper>
                  </Box>
                );
              })}

              {isTyping && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    ml: 1,
                    fontStyle: 'italic',
                  }}
                >
                  {t('analyzing')}
                </Typography>
              )}
            </Stack>
          </Container>
        </Box>
      )}
    </AnimatePresence>
  );
}