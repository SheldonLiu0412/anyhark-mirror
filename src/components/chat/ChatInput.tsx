'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-strong mx-auto flex w-full max-w-4xl gap-3 px-4 py-3 relative">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="说点什么..."
        rows={3}
        className="flex-1 resize-none overflow-y-auto bg-transparent text-xs leading-[20px] text-text-primary placeholder:text-text-tertiary outline-none"
        style={{ height: '60px' }}
        disabled={isLoading}
        autoFocus
      />
      {/* Enter hint */}
      <div className="absolute right-4 bottom-3 flex items-center gap-1 text-text-tertiary/50 pointer-events-none select-none">
        <kbd className="text-[9px] font-mono border border-white/[0.08] rounded px-1 py-0.5 leading-none">
          Enter
        </kbd>
      </div>
    </div>
  );
}
