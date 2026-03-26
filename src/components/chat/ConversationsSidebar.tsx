'use client';

import { useMemo } from 'react';
import { Conversation } from '@/lib/types';

interface ConversationsSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onClose?: () => void; // mobile overlay close
}

function deriveConversationTitle(conv: Conversation): string {
  const firstUser = conv.messages.find((m) => m.role === 'user');
  if (!firstUser) return '新对话';
  const normalized = firstUser.content.trim().replace(/\s+/g, ' ');
  if (!normalized) return '新对话';
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 3.5V12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3.5 8H12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className, direction }: { className?: string; direction: 'left' | 'right' }) {
  const rotate = direction === 'left' ? '180deg' : '0deg';
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${rotate})` }}
    >
      <path
        d="M5 3.5L9 7L5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3.8 3.8L10.2 10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.2 3.8L3.8 10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ConversationsSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  collapsed,
  onToggleCollapsed,
  onClose,
}: ConversationsSidebarProps) {
  const titleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of conversations) map[c.id] = deriveConversationTitle(c);
    return map;
  }, [conversations]);

  return (
    <aside
      className={[
        'glass flex h-full min-h-0 flex-col overflow-hidden border-border/50',
        collapsed ? 'w-16' : 'w-72',
      ].join(' ')}
      aria-label="会话列表"
    >
      <div className="shrink-0 border-b border-border/50 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewConversation}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-text-tertiary hover:border-white/[0.14] hover:bg-white/[0.06] transition-colors"
            title="新建对话"
          >
            <PlusIcon className="opacity-90" />
            {!collapsed && <span className="text-xs font-medium">新建对话</span>}
          </button>

          <div className="ml-auto flex items-center gap-1">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-text-tertiary/70 hover:text-text-tertiary transition-colors"
                title="关闭"
              >
                <XIcon />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-lg p-2 text-text-tertiary/70 hover:text-text-tertiary transition-colors"
              title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              <ChevronIcon direction={collapsed ? 'right' : 'left'} />
            </button>
          </div>
        </div>

        {!collapsed && <div className="mt-3 text-[11px] text-text-tertiary/70">对话</div>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-2">
            <div className="h-10 w-10 rounded-full border border-border/60 flex items-center justify-center">
              <PlusIcon className="text-text-tertiary" />
            </div>
            <div className="text-xs text-text-tertiary">暂无对话</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {conversations.map((conv, idx) => {
              const title = titleById[conv.id] ?? '新对话';
              const active = conv.id === activeConversationId;
              const displayChar = title.trim().slice(0, 1) || String(idx + 1);

              return (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversation(conv.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectConversation(conv.id); }}
                  className={[
                    'w-full rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer',
                    collapsed ? 'px-2 justify-center flex' : 'flex items-center gap-3',
                    active
                      ? 'border-white/[0.14] bg-white/[0.08]'
                      : 'border-transparent hover:bg-white/[0.06] hover:border-white/[0.10]',
                  ].join(' ')}
                  title={title}
                >
                  {collapsed ? (
                    <span className="text-[10px] font-mono text-text-tertiary/90">
                      {displayChar}
                    </span>
                  ) : (
                    <>
                      <span className="h-6 w-6 rounded-full border border-white/[0.10] bg-white/[0.03] flex items-center justify-center text-[10px] font-mono text-text-tertiary/90">
                        {displayChar}
                      </span>
                      <span className="flex-1 text-xs text-text-primary truncate">{title}</span>
                    </>
                  )}

                  {!collapsed && (
                    <span className="ml-auto flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="ml-2 rounded-lg p-2 text-text-tertiary/50 hover:text-text-tertiary transition-colors"
                        title="删除对话"
                        aria-label="删除对话"
                      >
                        <XIcon className="opacity-90" />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

