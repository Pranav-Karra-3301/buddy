import { NextRequest } from "next/server";
import { OpenAIClient } from "@/lib/openai";
import { AssistantStreamToSSE } from "@/lib/stream";
import OpenAI from "openai";

export const runtime = "edge";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

let assistantId: string | null = null;

function currentSemester(now: Date) {
  const month = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getMonth() + 1;
  if (month >= 1 && month <= 4) return "Spring";
  if (month >= 5 && month <= 8) return "Summer";
  return "Fall";
}

function buildInstructions(): string {
  const now = new Date();
  const etDate = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const sem = currentSemester(now);
  const year = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getFullYear();

  return `Identity

You are Buddy, the ML@PSU Student Assistant for Penn State University Park (State College, PA). You are warm, friendly, and practical.

Awareness
- Current date/time (ET): ${etDate}
- Current semester (approx.): ${sem} ${year}
- Default campus & geography: University Park (State College). When a user says “south,” interpret as South Halls/South residence halls near Redifer & South Dining Commons. Prefer on‑campus options unless they explicitly ask for downtown/off‑campus.

Purpose & Scope
- Answer questions about courses, majors, requirements, policies, campus life, dining, and services at Penn State.
- Use retrieval (file_search) for authoritative details. If something is not in the knowledge base, do not guess.

Safety & Reliability (No Hallucinations)
- Never fabricate facts, hours, policies, or people. If uncertain, say what you don’t know and offer the most helpful next step (where to check or who to contact).
- Prefer exact citations from retrieved sources; include short human‑readable source breadcrumbs.

Hours & “Open Now” checks
- If hours are available in retrieved knowledge, compare to the current ET time. If not available, say you don’t have exact hours and suggest the official dining/office page to confirm.

Style
- Brief greeting: “Hi, I’m Buddy.”
- Friendly, concise, and structured. Use bullets for steps/options. Keep answers compact but complete.
- Ask one clarifying question when needed (e.g., undergrad vs grad; which campus; dietary preference).

Retrieval Order (if applicable)
- Undergraduate topics → search undergraduate.pdf first.
- Graduate topics → graduate.pdf first.
- Law → law.pdf first.
- College of Medicine → collegeofmedicine.pdf first.
- Specific course details → relevant courses/*.json.
If policies conflict, prefer the relevant PDF bulletin over JSON.

Uncertainty & Limits
- If the PDFs/JSON don’t contain an answer, state that and provide the best next steps. Do not guess.

Response Skeleton
- Direct answer (numbers/names first)
- Context or options (bullets)
- Next steps
- Sources (short breadcrumbs)
- Optional clarifier (only if needed)`;
}

// Create or get the assistant with file_search capability
async function getAssistant(client: OpenAI, vectorStoreId: string) {
  if (assistantId) {
    try {
      // Try to retrieve existing assistant
      const assistant = await client.beta.assistants.retrieve(assistantId);
      // Always refresh instructions so date/semester stay current
      const updated = await client.beta.assistants.update(assistant.id, {
        name: "Buddy - ML@PSU Student Assistant",
        instructions: buildInstructions(),
        tools: [{ type: "file_search" }],
        tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
        model: "gpt-4o-mini",
        temperature: 0.2,
      });
      return updated;
    } catch {
      // Assistant doesn't exist, create a new one
      assistantId = null;
    }
  }

  // Create new assistant
  const assistant = await client.beta.assistants.create({
    name: "Buddy - ML@PSU Student Assistant",
    instructions: buildInstructions(),
    tools: [{ type: "file_search" }],
    tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
    model: "gpt-4o-mini",
    temperature: 0.2,
  });

  assistantId = assistant.id;
  return assistant;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages }: { messages: ChatMessage[]; useRag?: boolean } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid payload", { status: 400 });
    }

    const client = OpenAIClient();
    const vectorStoreId = process.env.VECTOR_STORE_ID;

    if (!vectorStoreId) {
      return new Response("Vector store not configured", { status: 500 });
    }

    // Get or create assistant
    const assistant = await getAssistant(client, vectorStoreId);

    // Create a new thread for this conversation
    const thread = await client.beta.threads.create();

    // Add all messages to the thread (excluding system message since it's in assistant instructions)
    const userMessages = messages.filter(m => m.role !== "system");
    for (const message of userMessages) {
      await client.beta.threads.messages.create(thread.id, {
        role: message.role as "user" | "assistant",
        content: message.content,
      });
    }

    // Create a run with streaming
    const stream = client.beta.threads.runs.stream(thread.id, {
      assistant_id: assistant.id,
    });

    // Convert Assistant stream to SSE format
    return AssistantStreamToSSE(stream);
  } catch (err) {
    console.error("/api/chat error", err);
    return new Response("Failed to stream response", { status: 500 });
  }
}