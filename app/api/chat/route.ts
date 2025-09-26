import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { messages, useRag = true } = await request.json();

    const vectorStoreId = process.env.VECTOR_STORE_ID;
    const shouldUseRag = useRag && vectorStoreId;

    const result = streamText({
      model: openai('gpt-5-nano'),
      system: `You are a helpful assistant. Be concise and accurate. ${
        shouldUseRag
          ? 'When using knowledge from the vector store, provide helpful context but avoid showing raw URLs or file paths.'
          : ''
      }`,
      messages,
      temperature: 0.7,
      maxTokens: 2000,
      ...(shouldUseRag && {
        tools: {
          file_search: openai.tools.fileSearch({
            vectorStoreIds: [vectorStoreId],
            maxNumResults: 5,
          }),
        },
        maxSteps: 3,
      }),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}