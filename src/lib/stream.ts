import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from 'openai/resources';

// Convert chat completions stream to SSE format
export function OpenAIToSSE(stream: Stream<ChatCompletionChunk>): Response {
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Handle chat completion deltas
          if (chunk.choices && chunk.choices.length > 0) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              // Send the delta as SSE format that matches client expectations
              const sseData = JSON.stringify({
                type: 'response.output_text.delta',
                delta: delta.content,
              });
              const sseMessage = `data: ${sseData}\n\n`;
              controller.enqueue(new TextEncoder().encode(sseMessage));
            }
          }
        }

        // Send completion signal
        const doneMessage = 'data: [DONE]\n\n';
        controller.enqueue(new TextEncoder().encode(doneMessage));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Convert Assistants API stream to SSE format
export function AssistantStreamToSSE(stream: AsyncIterable<unknown>): Response {
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          // Handle different types of assistant stream events
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((event as any).event === 'thread.message.delta') {
            // Extract text content from message delta
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content = (event as any).data?.delta?.content;
            if (content && content.length > 0) {
              for (const contentPart of content) {
                if (contentPart.type === 'text' && contentPart.text?.value) {
                  // Send the delta as SSE format that matches client expectations
                  const sseData = JSON.stringify({
                    type: 'response.output_text.delta',
                    delta: contentPart.text.value,
                  });
                  const sseMessage = `data: ${sseData}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sseMessage));
                }
              }
            }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if ((event as any).event === 'thread.run.completed') {
            // Run completed successfully
            const doneMessage = 'data: [DONE]\n\n';
            controller.enqueue(new TextEncoder().encode(doneMessage));
            controller.close();
            return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if ((event as any).event === 'thread.run.failed' || (event as any).event === 'thread.run.cancelled') {
            // Handle error cases
            console.error('Assistant run failed or cancelled:', event);
            controller.error(new Error('Assistant run failed'));
            return;
          }
        }

        // Fallback completion signal if no explicit completion event
        const doneMessage = 'data: [DONE]\n\n';
        controller.enqueue(new TextEncoder().encode(doneMessage));
        controller.close();
      } catch (error) {
        console.error('Assistant streaming error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Convert Responses API stream to SSE format expected by the client
export function ResponsesStreamToSSE(stream: AsyncIterable<unknown>): Response {
  const readable = new ReadableStream({
    async start(controller) {
      let toolStatusTimeout: NodeJS.Timeout | null = null;

      try {
        for await (const event of stream) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventData = event as any;

          // Log events in development to understand the structure
          if (process.env.NODE_ENV === 'development') {
            console.log('Stream event:', eventData.type, eventData);
          }

          if (eventData.type === 'response.output_text.delta') {
            const delta = eventData.delta as string | undefined;
            if (delta) {

              const sseData = JSON.stringify({
                type: 'response.output_text.delta',
                delta,
              });
              const sseMessage = `data: ${sseData}\n\n`;
              controller.enqueue(new TextEncoder().encode(sseMessage));
            }
          } else if (eventData.type === 'response.web_search_call.in_progress') {
            // Web search started
            const sseData = JSON.stringify({
              type: 'tool.status',
              status: '🌐 Searching the web...',
              isProcessing: true,
            });
            const sseMessage = `data: ${sseData}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));
          } else if (eventData.type === 'response.web_search_call.searching') {
            // Web search actively searching
            const sseData = JSON.stringify({
              type: 'tool.status',
              status: '🔍 Searching for information...',
              isProcessing: true,
            });
            const sseMessage = `data: ${sseData}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));
          } else if (eventData.type === 'response.web_search_call.completed') {
            // Web search completed - show processing status briefly
            const sseData = JSON.stringify({
              type: 'tool.status',
              status: '💭 Processing results...',
              isProcessing: true,
            });
            const sseMessage = `data: ${sseData}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));

            // Clear status after processing
            toolStatusTimeout = setTimeout(() => {
              const completeData = JSON.stringify({
                type: 'tool.complete',
                isProcessing: false,
              });
              const completeMessage = `data: ${completeData}\n\n`;
              controller.enqueue(new TextEncoder().encode(completeMessage));
            }, 1500);
          } else if (eventData.type.includes('file_search') && eventData.type.includes('in_progress')) {
            // File search started
            const sseData = JSON.stringify({
              type: 'tool.status',
              status: '📚 Searching documents...',
              isProcessing: true,
            });
            const sseMessage = `data: ${sseData}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));
          } else if (eventData.type.includes('file_search') && eventData.type.includes('completed')) {
            // File search completed
            const sseData = JSON.stringify({
              type: 'tool.status',
              status: '📖 Reading documents...',
              isProcessing: true,
            });
            const sseMessage = `data: ${sseData}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));

            // Clear status after processing
            toolStatusTimeout = setTimeout(() => {
              const completeData = JSON.stringify({
                type: 'tool.complete',
                isProcessing: false,
              });
              const completeMessage = `data: ${completeData}\n\n`;
              controller.enqueue(new TextEncoder().encode(completeMessage));
            }, 1500);
          } else if (eventData.type === 'response.completed') {
            // Clear any pending timeouts
            if (toolStatusTimeout) {
              clearTimeout(toolStatusTimeout);
            }

            const doneMessage = 'data: [DONE]\n\n';
            controller.enqueue(new TextEncoder().encode(doneMessage));
            controller.close();
            return;
          } else if (eventData.type === 'response.error') {
            // Clear any pending timeouts
            if (toolStatusTimeout) {
              clearTimeout(toolStatusTimeout);
            }

            console.error('Responses stream error event:', event);
            controller.error(new Error('Response stream error'));
            return;
          }
        }

        // Clear any pending timeouts
        if (toolStatusTimeout) {
          clearTimeout(toolStatusTimeout);
        }

        const doneMessage = 'data: [DONE]\n\n';
        controller.enqueue(new TextEncoder().encode(doneMessage));
        controller.close();
      } catch (error) {
        // Clear any pending timeouts
        if (toolStatusTimeout) {
          clearTimeout(toolStatusTimeout);
        }

        console.error('Responses streaming error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}