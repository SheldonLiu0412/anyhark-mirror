// Types for Anyhark 真实之镜

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dimensions?: DimensionResult[];
  timestamp: number;
}

export interface DimensionResult {
  id: DimensionId;
  name: string;
  analysis: string;
  score: number; // 1-10
  color: string;
}

export type DimensionId = 'feeling' | 'intuition' | 'sensing' | 'thinking';

export interface DimensionConfig {
  id: DimensionId;
  name: string;        // English name for radar label
  subtitle: string;    // Short Chinese subtitle for cards
  annotation: string;  // Psychological annotation + score interpretation
  label: string;       // Short label for radar chart
  systemPrompt: string;
  temperature: number;
  color: string;
}

// SSE event types
export interface DimensionEvent {
  type: 'dimension';
  data: DimensionResult;
}

export interface SynthesisEvent {
  type: 'synthesis';
  data: { content: string; done: boolean };
}

export interface ErrorEvent {
  type: 'error';
  data: { message: string };
}

export interface DoneEvent {
  type: 'done';
  data: Record<string, never>;
}

export type SSEEvent = DimensionEvent | SynthesisEvent | ErrorEvent | DoneEvent;

// Chat API request
export interface ChatRequest {
  messages: Pick<Message, 'role' | 'content'>[];
}

// A persisted conversation in the sidebar list
export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
