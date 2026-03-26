import { NextRequest } from 'next/server';
import { callDimension, streamSynthesis } from '@/lib/llm';
import { DIMENSIONS, SYNTHESIS_SYSTEM_PROMPT, DIMENSION_ORDER } from '@/lib/dimensions';
import { DimensionId, DimensionResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  let body: { messages: Array<{ role: string; content: string }> };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send an SSE event
      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // ── Phase 1: Fire all 4 dimension calls in parallel ──
      const dimensionResults: DimensionResult[] = [];

      const dimensionPromises = DIMENSION_ORDER.map(async (dimId: DimensionId) => {
        const dim = DIMENSIONS[dimId];
        try {
          const result = await callDimension(dim.systemPrompt, dim.temperature, messages);
          const dimensionResult: DimensionResult = {
            id: dim.id,
            name: dim.name,
            analysis: result.analysis,
            score: result.score,
            color: dim.color,
          };
          dimensionResults.push(dimensionResult);
          sendEvent('dimension', dimensionResult);
        } catch (err) {
          console.error(`Dimension ${dimId} failed:`, err);
        }
      });

      await Promise.allSettled(dimensionPromises);

      // ── Phase 2: Build synthesis prompt and stream response ──
      if (dimensionResults.length === 0) {
        sendEvent('error', { message: 'All dimension analyses failed' });
        sendEvent('done', {});
        controller.close();
        return;
      }

      const dimensionLabel: Record<DimensionId, string> = {
        feeling: '感受层',
        intuition: '直觉层',
        sensing: '感觉层',
        thinking: '思维层',
      };

      const analysisBlock = DIMENSION_ORDER
        .map((dimId) => {
          const result = dimensionResults.find((r) => r.id === dimId);
          if (!result) return null;
          return `- ${dimensionLabel[dimId]}：${result.analysis}`;
        })
        .filter(Boolean)
        .join('\n');

      // Inject dimension analyses into the system prompt so the model treats them
      // as internal cognition, not as user input.
      const synthesisSystemPrompt = `${SYNTHESIS_SYSTEM_PROMPT}

## 当前轮次的内部维度分析
在回应之前，你已从四个内在维度审视了对方的话，结果如下：

${analysisBlock}

以上是你的内部思考，现在请基于这些思考和你的主人格认知，直接回应对方（是和对方交谈，不要讲“基于四个维度的分析...”）。`;

      console.log(`[synthesis] starting — messages: ${messages.length}, systemPrompt: ${synthesisSystemPrompt.length} chars`);

      try {
        const synthesisStream = streamSynthesis(
          synthesisSystemPrompt,
          messages,
        );

        const reader = synthesisStream.getReader();
        let synthesisChunks = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          synthesisChunks++;
          sendEvent('synthesis', { content: value, done: false });
        }

        console.log(`[synthesis] complete — chunks sent: ${synthesisChunks}`);
        sendEvent('synthesis', { content: '', done: true });
      } catch (err) {
        console.error('Synthesis streaming failed:', err);
        sendEvent('error', {
          message: 'Synthesis failed: ' + (err instanceof Error ? err.message : 'Unknown error'),
        });
      }

      // ── Phase 3: Signal completion ──
      sendEvent('done', {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
