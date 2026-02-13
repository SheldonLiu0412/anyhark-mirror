'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, DimensionResult } from '@/lib/types';

interface UseChatReturn {
  messages: Message[];
  currentDimensions: DimensionResult[];
  currentSynthesis: string;
  isLoading: boolean;
  sendMessage: (content: string) => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentDimensions, setCurrentDimensions] = useState<DimensionResult[]>([]);
  const [currentSynthesis, setCurrentSynthesis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (isLoading || !content.trim()) return;

    // Abort any previous request
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentDimensions([]);
    setCurrentSynthesis('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let synthesisBuild = '';
      const dimensionsBuild: DimensionResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEventType = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              if (currentEventType === 'dimension') {
                dimensionsBuild.push(data as DimensionResult);
                setCurrentDimensions([...dimensionsBuild]);
              } else if (currentEventType === 'synthesis') {
                if (!data.done && data.content) {
                  synthesisBuild += data.content;
                  setCurrentSynthesis(synthesisBuild);
                }
              } else if (currentEventType === 'done') {
                // Finalize: create the assistant message
                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: synthesisBuild,
                  dimensions: [...dimensionsBuild],
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setCurrentDimensions([]);
                setCurrentSynthesis('');
              }
            } catch {
              // Skip malformed data
            }
            currentEventType = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Chat error:', err);
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '连接出现问题，请稍后重试。',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  return {
    messages,
    currentDimensions,
    currentSynthesis,
    isLoading,
    sendMessage,
  };
}
