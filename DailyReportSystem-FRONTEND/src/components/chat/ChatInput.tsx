'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import {
  Box, Paper, TextField, IconButton, Stack,
  Typography, Tooltip, alpha,
} from '@mui/material';
import {
  AutoAwesome as SparkleIcon,
  ArrowUpward as SendIcon,
  Close as CloseIcon,
  AttachFile as AttachIcon,
  SettingsVoice as VoiceIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { CircularProgress } from '@mui/material';
import { useTranslations } from 'next-intl';

interface ChatInputProps {
  hasStarted: boolean;
  isTyping: boolean;
  onSend: (value: string) => void;
  onInputChange?: (value: string) => void;
  modelName?: string;
}

export default function ChatInput({ hasStarted, isTyping, onSend, onInputChange, modelName }: ChatInputProps) {
  const t = useTranslations('chat.chatBox');
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  // IME composition state for Japanese input.
  const isComposing = useRef(false);
  const compositionEndAt = useRef<number | null>(null);
  //

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue('');
    onInputChange?.('');
  };

  return (
    <motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      {/* Dismissible Credit Banner */}
      <AnimatePresence>
        {!showBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 3,
                bgcolor: alpha('#6366F1', 0.08),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid',
                borderColor: alpha('#6366F1', 0.1),
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SparkleIcon sx={{ fontSize: 18, color: '#6366F1' }} />
                <Typography variant="caption" sx={{ color: '#4F46E5', fontWeight: 600 }}>
                  {t('bannerOne')}{modelName}{t('bannerTwo')}
                </Typography>
              </Stack>
              <IconButton size="small" onClick={() => setShowBanner(false)}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Box */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 5,
          border: '1px solid',
          borderColor: isFocused ? 'primary.main' : 'divider',
          bgcolor: 'background.paper',
          boxShadow: isFocused
            ? '0 20px 40px -12px rgba(99, 102, 241, 0.15)'
            : '0 8px 30px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={hasStarted ? 1 : 4}
          maxRows={10}
          placeholder={hasStarted ? t('textField.reply') : t('textField.placeholder')}
          value={inputValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => setInputValue(e.target.value)}
          onCompositionStart={() => {
            // 日本語入力を開始
            isComposing.current = true;
            compositionEndAt.current = null;
          }}
          onCompositionEnd={() => {
            // 日本語入力を終了
            isComposing.current = false;
            compositionEndAt.current = Date.now();
          }}
          onKeyDown={(e) => {
            const evt =  e as KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
            // 日本語入力中かどうかを確認
            if (isComposing.current || evt.nativeEvent.isComposing) {
              // 日本語入力中は何もしない
              return;
            }

            if (evt.key === 'Enter' && !evt.shiftKey) {
              // NOTE:
              // 【IME確定時の誤送信バグ対策】
              // 一部ブラウザ（Safari等）の仕様で、日本語入力の「変換確定Enter」の直後（数ミリ秒後）に、
              // isComposing=false の状態で再度KeyDown(Enter)イベントがすり抜けて降ってくる挙動がある。
              // 変換確定（CompositionEnd）から200ms以内のEnterは、人間が意図して押した送信指示ではなく、
              // ブラウザから遅れて届いた「確定Enterの残りカス」とみなして処理をスルーする。
              const now = Date.now();
              if (compositionEndAt.current && now - compositionEndAt.current < 200) {
                return;
              }

              evt.preventDefault();
              handleSend();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { border: 'none' },
              p: 3,
              pb: 1,
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
            },
          }}
        />

        {/* Action Toolbar */}
        <Box
          sx={{
            px: 2,
            pb: 2,
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1}>
            <Tooltip title="Attach Files">
              <IconButton size="small" disabled><AttachIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Voice Interaction">
              <IconButton size="small" disabled><VoiceIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
              <Box
                component={motion.div}
                animate={{ opacity: isTyping ? [0.4, 1, 0.4] : 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isTyping ? '#F59E0B' : '#10B981',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                }}
              >
                {modelName}
              </Typography>
            </Stack>

            <motion.div
              whileHover={!isTyping ? { scale: 1.05 } : {}}
              whileTap={!isTyping ? { scale: 0.95 } : {}}
            >
              <IconButton
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                sx={{
                  bgcolor: isTyping ? alpha('#6366F1', 0.1) : 'primary.main',
                  color: isTyping ? 'primary.main' : 'white',
                  borderRadius: 3,
                  width: 44,
                  height: 44,
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:hover': { bgcolor: isTyping ? alpha('#6366F1', 0.1) : 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: isTyping ? alpha('#6366F1', 0.1) : alpha('#000', 0.05),
                    color: isTyping ? 'primary.main' : 'text.disabled',
                  },
                }}
              >
                <AnimatePresence mode="wait">
                  {isTyping ? (
                    <motion.div key="loader" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                      <CircularProgress size={20} color="inherit" thickness={6} />
                    </motion.div>
                  ) : (
                    <motion.div key="send" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <SendIcon fontSize="small" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </IconButton>
            </motion.div>
          </Stack>
        </Box>
      </Paper>

      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.disabled', fontWeight: 500 }}
      >
        {t('footer')}
      </Typography>
    </motion.div>
  );
}
