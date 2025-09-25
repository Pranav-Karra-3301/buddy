import { Stream } from 'openai/streaming';

// Convert chat completions stream to SSE format
export function OpenAIToSSE(stream: Stream<any>): Response {
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
export function AssistantStreamToSSE(stream: Stream<any>): Response {
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          // Handle different types of assistant stream events
          if (event.event === 'thread.message.delta') {
            // Extract text content from message delta
            const content = event.data?.delta?.content;
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
          } else if (event.event === 'thread.run.completed') {
            // Run completed successfully
            const doneMessage = 'data: [DONE]\n\n';
            controller.enqueue(new TextEncoder().encode(doneMessage));
            controller.close();
            return;
          } else if (event.event === 'thread.run.failed' || event.event === 'thread.run.cancelled') {
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