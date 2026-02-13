// LLM client for Anthropic-compatible API (MiniMax via Anthropic Messages format)

const API_URL = () => process.env.OPENAI_API_URL!;
const API_KEY = () => process.env.OPENAI_API_KEY!;
const MODEL = () => process.env.OPENAI_MODEL!;

interface AnthropicMessage {
  role: string;
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

interface AnthropicStreamEvent {
  type: string;
  delta?: { type: string; text?: string };
}

/**
 * Non-streaming call to a dimension analysis endpoint.
 * Returns parsed JSON { analysis, score } from the model response.
 */
export async function callDimension(
  systemPrompt: string,
  temperature: number,
  messages: AnthropicMessage[],
): Promise<{ analysis: string; score: number }> {
  const res = await fetch(`${API_URL()}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL(),
      max_tokens: 1024,
      temperature,
      system: systemPrompt,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Dimension API call failed (${res.status}): ${errorText}`);
  }

  const data: AnthropicResponse = await res.json();
  // Find the text content block (skip thinking blocks)
  const textBlock = data.content?.find((block) => block.type === 'text');
  const rawText = textBlock?.text ?? '';

  // Handle cases where the model wraps JSON in markdown code blocks
  let jsonStr = rawText.trim();

  // Try closed code block first, then unclosed (truncated output)
  const closedBlock = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (closedBlock) {
    jsonStr = closedBlock[1].trim();
  } else {
    const openBlock = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*)/);
    if (openBlock) {
      jsonStr = openBlock[1].trim();
    }
  }

  // Try direct JSON.parse first
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      analysis: String(parsed.analysis ?? ''),
      score: Math.max(1, Math.min(10, Number(parsed.score) || 5)),
    };
  } catch {
    // JSON is malformed/truncated — extract fields with regex
    const analysisMatch = jsonStr.match(/"analysis"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
    const scoreMatch = jsonStr.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/);

    const analysis = analysisMatch?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n') ?? '';
    const score = scoreMatch ? Math.max(1, Math.min(10, Number(scoreMatch[1]) || 5)) : 5;

    if (analysis) {
      return { analysis, score };
    }

    // Last resort: use raw text as analysis
    return { analysis: rawText.trim(), score: 5 };
  }
}

/**
 * Streaming call for synthesis. Returns a ReadableStream of text chunks.
 * Uses Anthropic SSE streaming format (event: content_block_delta).
 */
export function streamSynthesis(
  systemPrompt: string,
  messages: AnthropicMessage[],
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      let res: Response;
      try {
        res = await fetch(`${API_URL()}/v1/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY(),
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL(),
            max_tokens: 2048,
            temperature: 0.7,
            system: systemPrompt,
            messages,
            stream: true,
          }),
        });
      } catch (err) {
        controller.error(err);
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        controller.error(
          new Error(`Synthesis API call failed (${res.status}): ${errorText}`),
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        controller.error(new Error('No response body'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines from the buffer
          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? '';

          let currentEventType = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith('data: ') && currentEventType === 'content_block_delta') {
              const jsonStr = line.slice(6);
              try {
                const event: AnthropicStreamEvent = JSON.parse(jsonStr);
                if (event.delta?.text) {
                  controller.enqueue(event.delta.text);
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }

      controller.close();
    },
  });
}
