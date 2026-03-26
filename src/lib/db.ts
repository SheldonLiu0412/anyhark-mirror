import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DimensionResult } from './types';

// Supabase is optional — if env vars are absent the module becomes a no-op.
function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const supabase = getClient();

// ── Upsert conversation row ──
export async function upsertConversation(id: string, userIp: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('mirror_conversations')
    .upsert({ id, user_ip: userIp }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) console.error('[db] upsertConversation:', error.message);
}

// ── Save a single message ──
export async function saveMessage(params: {
  id: string;
  conversationId: string;
  userIp: string;
  role: 'user' | 'assistant';
  content: string;
  dimensions?: DimensionResult[];
}): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('mirror_messages').upsert(
    {
      id: params.id,
      conversation_id: params.conversationId,
      user_ip: params.userIp,
      role: params.role,
      content: params.content,
      dimensions: params.dimensions ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) console.error('[db] saveMessage:', error.message);
}
