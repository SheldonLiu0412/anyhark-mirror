'use client';

import { Message } from '@/lib/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatContainerProps {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
  onSend: (content: string) => void;
}

export function ChatContainer({
  messages,
  streamingContent,
  isLoading,
  onSend,
}: ChatContainerProps) {
  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isLoading={isLoading}
      />
      <div className="shrink-0 border-t border-border/50 p-3">
        <ChatInput onSend={onSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
