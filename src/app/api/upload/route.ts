import { NextRequest } from 'next/server';
import { OpenAIClient } from '@/lib/openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const vs = process.env.VECTOR_STORE_ID;
    if (!vs) return new Response('VECTOR_STORE_ID is required', { status: 500 });

    const form = await req.formData();
    const files: File[] = [];
    for (const [key, value] of form.entries()) {
      if (key === 'files' && value instanceof File) files.push(value);
    }
    if (files.length === 0) return new Response('No files provided', { status: 400 });

    const client = OpenAIClient();

    // Upload and index in the vector store, waiting until ready.
    const batch = await client.vectorStores.fileBatches.uploadAndPoll(vs, { files });

    return Response.json({ status: batch.status, fileCounts: batch.file_counts, vectorStoreId: vs });
  } catch (err) {
    return new Response('Upload failed', { status: 500 });
  }
}

