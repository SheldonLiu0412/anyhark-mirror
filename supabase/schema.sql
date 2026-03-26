-- ============================================================
-- Anyhark Mirror — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 会话表
create table if not exists mirror_conversations (
  id          text        primary key,
  user_ip     text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 消息表
create table if not exists mirror_messages (
  id              text        primary key,
  conversation_id text        not null references mirror_conversations(id) on delete cascade,
  user_ip         text        not null,
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  dimensions      jsonb       null,
  created_at      timestamptz not null default now()
);

-- 索引
create index if not exists idx_mirror_conversations_user_ip on mirror_conversations(user_ip);
create index if not exists idx_mirror_messages_conversation  on mirror_messages(conversation_id, created_at);
create index if not exists idx_mirror_messages_user_ip       on mirror_messages(user_ip);

-- 自动更新 mirror_conversations.updated_at
create or replace function mirror_touch_conversation()
returns trigger language plpgsql as $$
begin
  update mirror_conversations
  set    updated_at = now()
  where  id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists trg_mirror_touch_conversation on mirror_messages;
create trigger trg_mirror_touch_conversation
  after insert on mirror_messages
  for each row execute procedure mirror_touch_conversation();
