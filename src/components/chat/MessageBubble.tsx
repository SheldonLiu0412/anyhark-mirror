'use client';

import MarkdownRender from 'markstream-react';
import { Message } from '@/lib/types';
import { DimensionPanel } from './DimensionPanel';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-white/[0.06] text-text-primary'
            : 'text-text-primary'
        }`}
      >
        {!isUser && message.dimensions && (
          <DimensionPanel dimensions={message.dimensions} />
        )}

        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="prose-mirror text-sm leading-relaxed">
            <MarkdownRender content={message.content} final />
          </div>
        )}
      </div>
    </div>
  );
}

/* Streaming bubble shown while synthesis is in progress */
interface StreamingBubbleProps {
  content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-3 text-text-primary">
        <div className="prose-mirror text-sm leading-relaxed">
          <MarkdownRender content={content} />
          <span className="inline-block w-[2px] h-[14px] bg-mirror-blue/60 ml-0.5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
