export function buildRagTools(useRag: boolean) {
  const vs = process.env.VECTOR_STORE_ID;
  if (!useRag || !vs) return {} as Record<string, unknown>;
  return {
    tools: [{ type: 'file_search' as const }],
    tool_resources: {
      file_search: { vector_store_ids: [vs] },
    },
  };
}

