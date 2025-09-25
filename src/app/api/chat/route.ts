import { NextRequest } from "next/server";
import { OpenAIClient } from "@/lib/openai";
import { ResponsesStreamToSSE } from "@/lib/stream";

export const runtime = "edge";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Responses API only. No Assistants-managed threads.

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

  return `You are Buddy, a friendly and practical student assistant for Penn State University Park. You're powered by a mix of models and a router to provide the best answers.

Current Info:
- Date/Time (ET): ${etDate}
- Semester: ${sem} ${year}
- Default Campus: University Park (State College, PA) - assume this unless explicitly told otherwise

Core Directives:
1.  **Answer PSU Questions**: Address queries on courses, majors, campus life, and policies for University Park campus by default.
2.  **Smart Tool Use**:
    - For static, policy-like information (e.g., course requirements, academic policies), use 'file_search' on the knowledge base first.
    - For dynamic, time-sensitive information (e.g., operating hours, event schedules, current news), prefer 'web_search'. If you use 'file_search' and find nothing, immediately try 'web_search'.
3.  **No Hallucinations**: If an answer isn't in the knowledge base or verifiable via web search, state that you don't know. Never invent facts.
4.  **Response Structure**: Structure all responses with clear formatting:
    - **Bold key information** like times, dates, deadlines, requirements
    - Use **## Headings** for main sections when appropriate
    - Use bullet points for lists and multiple items
    - Always include **### Sources** section at the end with citations
    - Make sure URLs are properly formatted as clickable markdown links
5.  **Retrieval Priority**: When using file_search, prioritize sources in this order: Undergraduate PDF, Graduate PDF, Law PDF, College of Medicine PDF, course JSONs, then student organization JSONs.
6.  **Natural Communication**: Respond naturally and directly without using "Preamble:" or similar formatting artifacts. Jump straight into answering the question.`;
}

// (no Assistants helpers needed here)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, useRag }: { messages: ChatMessage[]; useRag?: boolean } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid payload", { status: 400 });
    }

    const client = OpenAIClient();
    const vectorStoreId = process.env.VECTOR_STORE_ID;

    // Build Responses API request (primary path). Attach tools conditionally.
    const systemInstruction = buildInstructions();
    const useVector = !!(useRag && vectorStoreId);

    const tools: Array<{ type: string; vector_store_ids?: string[] }> = [];
    if (useVector && vectorStoreId) tools.push({ type: "file_search", vector_store_ids: [vectorStoreId] });
    // Allow web search; model decides if/when to use it per instructions
    tools.push({ type: "web_search" });

    const input = [
      { role: "system" as const, content: systemInstruction },
      ...messages.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (client as any).responses.stream({
      model: "gpt-5-nano",
      input,
      tools,
      stream: true,
      parallel_tool_calls: false, // Force sequential tool use
    });

    return ResponsesStreamToSSE(stream);
  } catch (err) {
    console.error("/api/chat error", err);
    return new Response("Failed to stream response", { status: 500 });
  }
}