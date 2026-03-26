'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Conversation, DimensionResult, Message } from '@/lib/types';

interface UseConversationsChatReturn {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  currentDimensions: DimensionResult[];
  currentSynthesis: string;
  isLoading: boolean;
  sendMessage: (content: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
}

const STORAGE_KEY = 'anyhark-mirror-conversations-v1';

type StoredPayload = {
  version: 1;
  activeConversationId: string | null;
  conversations: Conversation[];
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeConversation(): Conversation {
  const now = Date.now();
  return {
    id: makeId('conv'),
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function toStoredPayload(conversations: Conversation[], activeConversationId: string | null): StoredPayload {
  return {
    version: 1,
    conversations,
    activeConversationId,
  };
}

export function useConversationsChat(): UseConversationsChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [currentDimensions, setCurrentDimensions] = useState<DimensionResult[]>([]);
  const [currentSynthesis, setCurrentSynthesis] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);

  const hasHydratedRef = useRef(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const activeMessagesRef = useRef<Message[]>([]);

  // Typewriter drip: chars received from API but not yet displayed
  const dripRafRef = useRef<number | null>(null);
  const displayQueueRef = useRef('');
  const pendingFinalizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const activeMessages = useMemo(() => {
    const active = conversations.find((c) => c.id === activeConversationId);
    return active?.messages ?? [];
  }, [conversations, activeConversationId]);

  useEffect(() => {
    activeMessagesRef.current = activeMessages;
  }, [activeMessages]);

  const resetStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (dripRafRef.current !== null) {
      cancelAnimationFrame(dripRafRef.current);
      dripRafRef.current = null;
    }
    displayQueueRef.current = '';
    pendingFinalizeRef.current = null;
    setIsLoading(false);
    setCurrentDimensions([]);
    setCurrentSynthesis('');
  }, []);

  // Cleanup drip rAF on unmount
  useEffect(() => () => {
    if (dripRafRef.current !== null) cancelAnimationFrame(dripRafRef.current);
  }, []);

  useEffect(() => {
    // Load from localStorage once.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        const payload = parsed as Partial<StoredPayload>;
        if (payload?.version === 1 && Array.isArray(payload.conversations) && payload.conversations.length > 0) {
          const loadedConversations = payload.conversations;
          const loadedActiveId =
            typeof payload.activeConversationId === 'string' && loadedConversations.some((c) => c.id === payload.activeConversationId)
              ? payload.activeConversationId
              : loadedConversations[0].id;

          setConversations(loadedConversations);
          setActiveConversationId(loadedActiveId);
          hasHydratedRef.current = true;
          return;
        }
      }
    } catch {
      // Ignore and fallback to fresh state.
    }

    const first = makeConversation();
    setConversations([first]);
    setActiveConversationId(first.id);
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(toStoredPayload(conversations, activeConversationId)),
      );
    } catch {
      // Ignore persistence errors (storage quota, etc.)
    }
  }, [conversations, activeConversationId]);

  const createConversation = useCallback(() => {
    resetStreaming();
    const conv = makeConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
  }, [resetStreaming]);

  const selectConversation = useCallback(
    (id: string) => {
      if (id === activeConversationIdRef.current) return;
      resetStreaming();
      setActiveConversationId(id);
    },
    [resetStreaming],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      const current = conversations;
      if (id === activeConversationIdRef.current) {
        resetStreaming();
      } else {
        // Keep streaming state if deleting a non-active conversation.
        // (Abort would be surprising to the user.)
      }

      const remain = current.filter((c) => c.id !== id);
      if (remain.length === 0) {
        const conv = makeConversation();
        setConversations([conv]);
        setActiveConversationId(conv.id);
        return;
      }

      const idx = current.findIndex((c) => c.id === id);
      if (activeConversationIdRef.current === id) {
        const next = remain[Math.max(0, idx - 1)] ?? remain[0];
        setActiveConversationId(next.id);
      }

      setConversations(remain);
    },
    [conversations, resetStreaming],
  );

  const sendMessage = useCallback(async (content: string) => {
    const convId = activeConversationIdRef.current;
    if (!convId) return;

    const trimmed = content.trim();
    if (isLoadingRef.current || !trimmed) return;

    const currentMessages = activeMessagesRef.current;

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const userMessage: Message = {
      id: makeId('user'),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const updatedMessages = [...currentMessages, userMessage];

    // Update immediately (optimistic) so sidebar persists user input.
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === convId
          ? {
              ...conv,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : conv,
      ),
    );

    setCurrentDimensions([]);
    setCurrentSynthesis('');
    setIsLoading(true);

    const bodyMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: bodyMessages,
          conversationId: convId,
          lastUserMessageId: userMessage.id,
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
      let didFinalize = false;

      // Persists across chunks so event type is never lost at packet boundaries.
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data: unknown = JSON.parse(dataStr);

              if (currentEventType === 'dimension') {
                dimensionsBuild.push(data as DimensionResult);
                setCurrentDimensions([...dimensionsBuild]);
              } else if (currentEventType === 'synthesis') {
                const synthesisData = data as { content?: string; done?: boolean };
                if (!synthesisData.done && synthesisData.content) {
                  synthesisBuild += synthesisData.content;
                  displayQueueRef.current += synthesisData.content;
                  // Start the rAF drip loop if not already running.
                  // Uses time-based emission so speed stays constant across frame rates.
                  if (dripRafRef.current === null) {
                    const CHARS_PER_SEC = 50;
                    let lastTime = performance.now();

                    const tick = (now: number) => {
                      const elapsed = Math.min(now - lastTime, 100); // cap to avoid burst after tab switch
                      lastTime = now;

                      if (displayQueueRef.current.length > 0) {
                        const charsToEmit = Math.max(1, Math.round(elapsed * CHARS_PER_SEC / 1000));
                        const emit = displayQueueRef.current.slice(0, charsToEmit);
                        displayQueueRef.current = displayQueueRef.current.slice(charsToEmit);
                        setCurrentSynthesis((prev) => prev + emit);
                        dripRafRef.current = requestAnimationFrame(tick);
                      } else if (pendingFinalizeRef.current) {
                        dripRafRef.current = null;
                        const fn = pendingFinalizeRef.current;
                        pendingFinalizeRef.current = null;
                        fn();
                      } else {
                        // Queue empty, keep the loop alive waiting for more chunks
                        dripRafRef.current = requestAnimationFrame(tick);
                      }
                    };

                    dripRafRef.current = requestAnimationFrame(tick);
                  }
                }
              } else if (currentEventType === 'done') {
                didFinalize = true;
                const finalContent = synthesisBuild;
                const finalDimensions = [...dimensionsBuild];

                const doFinalize = () => {
                  const assistantMessage: Message = {
                    id: makeId('assistant'),
                    role: 'assistant',
                    content: finalContent,
                    dimensions: finalDimensions,
                    timestamp: Date.now(),
                  };
                  // All three updates in one batch: MessageBubble appears (no enter animation),
                  // StreamingBubble disappears — same render, no empty frame.
                  setConversations((prev) =>
                    prev.map((conv) =>
                      conv.id === convId
                        ? { ...conv, messages: [...conv.messages, assistantMessage], updatedAt: Date.now() }
                        : conv,
                    ),
                  );
                  setCurrentDimensions([]);
                  setCurrentSynthesis('');
                };

                if (displayQueueRef.current.length === 0 && dripRafRef.current === null) {
                  // Queue already empty, finalize immediately
                  doFinalize();
                } else {
                  // Let the drip loop finalize once the queue drains
                  pendingFinalizeRef.current = doFinalize;
                }
              }
            } catch {
              // Skip malformed data
            }

            // Reset after consuming the data line; blank line also resets.
            currentEventType = '';
          } else if (line === '') {
            currentEventType = '';
          }
        }
      }

      // Some runtimes may finish the stream before the final `event: done`
      // chunk gets parsed. Fallback-finalize to ensure assistant text appears.
      if (!didFinalize && (synthesisBuild || dimensionsBuild.length > 0)) {
        const finalContent = synthesisBuild;
        const finalDimensions = [...dimensionsBuild];

        const doFinalize = () => {
          const assistantMessage: Message = {
            id: makeId('assistant'),
            role: 'assistant',
            content: finalContent,
            dimensions: finalDimensions,
            timestamp: Date.now(),
          };
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === convId
                ? { ...conv, messages: [...conv.messages, assistantMessage], updatedAt: Date.now() }
                : conv,
            ),
          );
          setCurrentDimensions([]);
          setCurrentSynthesis('');
        };

        if (displayQueueRef.current.length === 0 && dripRafRef.current === null) {
          doFinalize();
        } else {
          pendingFinalizeRef.current = doFinalize;
        }
      }
    } catch (err) {
      // Abort shouldn't add any extra messages.
      if ((err as Error).name === 'AbortError') return;

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === convId
            ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  {
                    id: makeId('error'),
                    role: 'assistant',
                    content: '连接出现问题，请稍后重试。',
                    timestamp: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : conv,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    conversations,
    activeConversationId,
    messages: activeMessages,
    currentDimensions,
    currentSynthesis,
    isLoading,
    sendMessage,
    createConversation,
    deleteConversation,
    selectConversation,
  };
}

