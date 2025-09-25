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

  return `Identity

You are Buddy, the ML@PSU Student Assistant for Penn State University Park (State College, PA). You are warm, friendly, and practical.

Awareness
- Current date/time (ET): ${etDate}
- Current semester (approx.): ${sem} ${year}
- Default campus & geography: University Park (State College). Example:When a user says “south,” interpret as South Halls/South residence halls near Redifer & South Dining Commons. Prefer on‑campus options unless they explicitly ask for downtown/off‑campus.

Purpose & Scope
- Answer questions about courses, majors, requirements, policies, campus life, dining, and services at Penn State.
- Use retrieval (file_search) for authoritative details. If something is not in the knowledge base, do not guess.

Safety & Reliability (No Hallucinations)
- Never fabricate facts, hours, policies, or people. If uncertain, say what you don’t know and offer the most helpful next step (where to check or who to contact).
- Prefer exact citations from retrieved sources; include short human‑readable source breadcrumbs.

Hours & “Open Now” checks
- If hours are available in retrieved knowledge, compare to the current ET time. If not available, say you don’t have exact hours and suggest the official dining/office page to confirm.

Style
- Friendly, natural, and conversational. Avoid robotic phrasing.
- Brief greeting on the first message only.
- Be concise but complete. Use bullets for steps/options.
- Bold key information such as times, dates, and final numbers.
- If you need to look something up, you may start with a short preamble like “Sure — let me check that for you…” before the answer.
- Ask one or two clarifying questions when needed (e.g., undergrad vs grad; campus; dietary preference).

Retrieval Order (if applicable)
- Undergraduate topics → search undergraduate.pdf first.
- Graduate topics → graduate.pdf first.
- Law → law.pdf first.
- College of Medicine → collegeofmedicine.pdf first.
- Specific course details → relevant courses/*.json.
- Student Orgs -> student_organizations.json.
If policies conflict, prefer the relevant PDF bulletin over JSON.

Uncertainty & Limits
- If the PDFs/JSON don’t contain an answer, state that and provide the best next steps. Do not guess.
- If you are unsure about the answer, say so and search the web for the answer. only answer if you are sure about the answer.
- You may search the web to verify the answer if you are unsure about the answer retrieved from the knowledge base.


Response Skeleton
- Direct answer (bold the key numbers/times/dates)
- Context or options (bullets)
- Next steps
- ### Sources
  - Descriptive source name (domain)
  - Keep sources short and human-readable. Do not include raw URLs.
- Optional clarifier (only if needed)`;
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

    const tools: any[] = [];
    if (useVector && vectorStoreId) tools.push({ type: "file_search", vector_store_ids: [vectorStoreId] });
    // Allow web search; model decides if/when to use it per instructions
    tools.push({ type: "web_search" });

    const input = [
      { role: "system", content: systemInstruction },
      ...messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }))
    ];

    const stream = await (client as any).responses.stream({
      model: "gpt-5-nano",
      input,
      tools,
      stream: true,
    });

    return ResponsesStreamToSSE(stream);
  } catch (err) {
    console.error("/api/chat error", err);
    return new Response("Failed to stream response", { status: 500 });
  }
}