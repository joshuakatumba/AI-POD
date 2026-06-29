'use client';

import { useEffect, useState } from 'react';
import { Box, Container } from '@mui/material';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
import { MessageType, SessionMessageType } from '@/_types/chat';
import { chatStreamAPI, getSessionByIdAPI } from '@/app/[locale]/chat';

type ChatInterfaceProps = {
  sessionId: string;
  originalMessages: SessionMessageType[];
  modelName: string;
}

export default function ChatInterface({ sessionId, originalMessages, modelName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<(SessionMessageType | MessageType)[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!sessionId) return
    setMessages(originalMessages);
  }, [sessionId, originalMessages]);

  const hasStarted = messages.length > 0;

  const handleSend = async (inputValue: string) => {
    if (!inputValue.trim()) return;

    const userMsg: MessageType = { id: String(Date.now()), content: inputValue, role: 'user' };
    setMessages((prev) => [...prev, userMsg]);

    const aiMsgId = String(Date.now()) + "-ai";
    setMessages((prev) => [...prev, { id: aiMsgId, content: '', role: 'ai' }]);
    setIsTyping(true);

    try {
      const response = await chatStreamAPI(
        sessionId,
        { text: inputValue }
      )

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      setIsTyping(false);

      let buffer = "";
      let lastText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        // 1. Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // 2. Split messages safely (SSE or newline-delimited JSON)
        const lines = buffer.split("\n");

        // Keep last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // 3. If using SSE, strip "data: "
            const cleaned = line.startsWith("data: ")
              ? line.replace("data: ", "")
              : line;

            const parsed = JSON.parse(cleaned);

            if (parsed.type === "token" || parsed.type === "final") {
              let content = parsed.data ?? "";

              // 4. Fix escaped newlines (if backend still sends them)
              content = content
                .replace(/\\\\n/g, '\n')
                .replace(/\\n/g, '\n');

              // 5. Avoid unnecessary re-renders
              if (content !== lastText) {
                lastText = content;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId
                      ? { ...msg, content } // overwrite (correct for full-text backend)
                      : msg
                  )
                );
              }
            }
          } catch (e) {
            console.warn("Failed to parse chunk:", line, e);
          }
        }
      }


    } catch (error) {
      console.error("Streaming error:", error);
      setIsTyping(false);
    }
  };

  return (
    <Box
      sx={{
        height: { xs: '100dvh', md: '100vh' },
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        justifyContent: hasStarted ? 'flex-end' : 'center',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}
    >
      <MessageBubble messages={messages} isTyping={isTyping} />


      <Container maxWidth="md" sx={{ pb: hasStarted ? 2 : 0 }}>
        <ChatHeader hasStarted={hasStarted} hasStartedTyping={inputValue.length > 0} />
        <ChatInput hasStarted={hasStarted} isTyping={isTyping} onSend={handleSend} onInputChange={setInputValue} modelName={modelName} />
      </Container>
    </Box>
  );
}