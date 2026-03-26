'use client';

import { useState } from 'react';
import { useConversationsChat } from '@/hooks/useConversationsChat';
import { AuroraBackground, GradientTitle } from '@/components/effects/SciFiEffects';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ConversationsSidebar } from '@/components/chat/ConversationsSidebar';
import { MirrorContainer } from '@/components/mirror/MirrorContainer';

export default function Home() {
  const {
    conversations,
    activeConversationId,
    messages,
    currentDimensions,
    currentSynthesis,
    isLoading,
    sendMessage,
    createConversation,
    deleteConversation,
    selectConversation,
  } = useConversationsChat();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // For the mirror panel, show current streaming dimensions
  // or the dimensions from the last assistant message (smooth transition)
  const lastAssistantDimensions = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].dimensions?.length) {
        return messages[i].dimensions!;
      }
    }
    return [];
  })();

  const mirrorDimensions = currentDimensions.length > 0
    ? currentDimensions
    : lastAssistantDimensions;

  return (
    <div className="aurora-bg flex h-screen flex-col overflow-hidden">
      <AuroraBackground />

      {/* Header */}
      <header className="relative z-10 shrink-0">
        <div className="flex items-center gap-3 px-6 py-3" style={{ background: 'rgba(10,10,15,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <img src="/favicon-32x32.png" alt="" className="h-5 w-5 opacity-80" />
          <GradientTitle className="text-lg font-semibold tracking-tight">
            真实之镜
          </GradientTitle>
          <div className="h-3 w-px bg-white/[0.1]" />
          <span className="text-text-tertiary text-[11px] font-light tracking-[0.15em] uppercase">
            Mirror of Truth
          </span>

          <div className="ml-auto lg:hidden">
            <button
              type="button"
              onClick={() => {
                setSidebarCollapsed(false);
                setMobileSidebarOpen(true);
              }}
              className="rounded-xl border border-white/[0.08] px-3 py-1.5 text-[11px] text-text-tertiary/80 hover:border-white/[0.14] hover:bg-white/[0.06] transition-colors"
            >
              会话
            </button>
          </div>
        </div>
        {/* Bottom shimmer line */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.15) 20%, rgba(56,189,248,0.25) 50%, rgba(192,192,192,0.15) 80%, transparent 100%)' }} />
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 gap-4 overflow-hidden p-4">
        {/* Conversations sidebar (desktop) */}
        <div className="hidden lg:flex">
          <ConversationsSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            onNewConversation={createConversation}
            onDeleteConversation={deleteConversation}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        {/* Chat Panel */}
        <div className="glass flex flex-1 flex-col overflow-hidden">
          <ChatContainer
            messages={messages}
            streamingContent={currentSynthesis}
            isLoading={isLoading}
            onSend={sendMessage}
          />
        </div>

        {/* Mirror Panel */}
        <div className="glass mirror-glow hidden w-80 shrink-0 overflow-y-auto p-5 lg:block">
          <MirrorContainer
            dimensions={mirrorDimensions}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Conversations sidebar (mobile overlay) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <ConversationsSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                selectConversation(id);
                setMobileSidebarOpen(false);
              }}
              onNewConversation={() => {
                createConversation();
                setMobileSidebarOpen(false);
              }}
              onDeleteConversation={deleteConversation}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
