'use client';

import { useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import { MessageBubble, StreamingBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
}

export function MessageList({ messages, streamingContent, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4">
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <div className="animate-float">
            <div className="h-16 w-16 rounded-full border border-border flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="rgba(192,192,192,0.3)" strokeWidth="1.5" />
                <circle cx="14" cy="14" r="6" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                <circle cx="14" cy="14" r="1.5" fill="rgba(56,189,248,0.5)" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm text-text-secondary">说点什么，让镜子照见你</p>
            <p className="text-xs text-text-tertiary mt-1">
              四个维度同时审视，然后给你一个真实的回应
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Streaming synthesis */}
          {streamingContent && (
            <StreamingBubble content={streamingContent} />
          )}

          {/* Loading indicator (before synthesis starts) */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-mirror-blue/40 animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-mirror-blue/40 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-mirror-blue/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-text-tertiary">正在审视...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
