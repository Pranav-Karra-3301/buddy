/*
  Simple helper to create a Vector Store and upload files.
  Usage:
    npm run seed:vector ./docs/file1.md ./docs/file2.pdf

  Prints VECTOR_STORE_ID on success.
*/
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is required');
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  const vs = await client.vectorStores.create({ name: 'local-threads-chatbot' });
  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    console.log('No files provided; created empty Vector Store.');
    console.log('VECTOR_STORE_ID=', vs.id);
    return;
  }

  const streams = filePaths.map((p) => fs.createReadStream(path.resolve(p)));
  const batch = await client.vectorStores.fileBatches.uploadAndPoll(vs.id, { files: streams });
  if (batch.status !== 'completed') {
    console.warn('Upload status:', batch.status);
  }
  console.log('VECTOR_STORE_ID=', vs.id);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

