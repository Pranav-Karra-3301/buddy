You are building a production-quality Next.js 14 (App Router, TypeScript) project called “local-threads-chatbot” that implements a lightweight ChatGPT/Claude-style chat UI with:

• OpenAI Responses API (model: gpt-5-nano) with streaming.
• No server-side chat storage. All conversations/threads are local to the browser (localStorage).
• Optional RAG via OpenAI Vector Store: when a VECTOR_STORE_ID is provided, attach it so the model can do file_search.
• Smooth, modern UX (animations, typing dots, hover toolbars, skeletons).
• Strict adherence to the design tokens + interaction rules below.

──────────
Functional requirements
──────────
1) Chat:
   - Send user messages to /api/chat (Edge runtime) which streams tokens back via SSE/ReadableStream.
   - Show a “typing…” 3-dot indicator while waiting.
   - Stream render assistant text (character-by-character feel).
   - Actions on each assistant message: Copy, Regenerate, 👍/👎 feedback (no backend; just console.log + UI state).
2) Threads:
   - Local-only: a thread is { id, title, createdAt, messages: [{ id, role, content, createdAt }] }.
   - Sidebar shows a list of local threads; click to switch. New Thread button clears composer and state.
   - Autotitle a thread: first user message (truncate 40 chars).
   - Persist entire threads array in localStorage (key: "ltc:threads:v1").
3) RAG (optional):
   - If process.env.VECTOR_STORE_ID is present, include file_search so the model can retrieve.
   - Add a small toggle in the UI “Use knowledge base” (default ON when VECTOR_STORE_ID exists).
4) No server DB. No analytics. No logging of message content server-side.

──────────
Design system (must implement exactly)
──────────
Font: PT Serif throughout.

DARK THEME
- Background: #212121
- Chatbox surfaces: #303030
- Accent: #99CDFE
- Buttons: #FFFFFF (text/icons on buttons #000 unless inverted needed)
- Darker shade (when needed): #181818

LIGHT THEME
- Background: #FAF9F5
- Selections color: #F0EEE6
- Accent: #0285FF
- Darker shade (when needed): #F5F4ED
- Buttons: #000000

Shared UI rules
- Corner Radius: 12–16px for chat bubbles; 8–10px input fields
- Shadows: 0 2px 8px rgba(0,0,0,0.08)
- Body text: 16px PT Serif; line-height 1.6
- Max content width: 760px
- Message alignment: user (right), bot (left)
- Spacing: 20–24px vertical rhythm
- Animations:
  • Message slide-in from bottom, 220ms ease-out
  • Button/micro-interactions 160–200ms transitions
  • Hover states: subtle bg tint (use darker shade tokens)
  • Skeleton/pulse on load
- Input:
  • Expandable textarea (auto-grow; max-height = 40% viewport)
  • Placeholder cycles: “Ask anything…”, “Follow up…”
  • Actions embedded: attach (future), voice (future), submit
  • Focus border highlights with accent; subtle shadow on focus
- Stream behavior:
  • Auto-scroll to bottom while streaming
  • When user scrolls up, do NOT force scroll; show “Jump to latest” pill
- Message toolbar on hover (assistant msgs): Copy | Regenerate | 👍 | 👎

──────────
Project structure
──────────
- /app
  - /api/chat/route.ts        (Edge runtime: stream OpenAI Responses)
  - /globals.css              (CSS variables + base styles, import PT Serif)
  - /layout.tsx
  - /page.tsx                 (Main chat app shell)
- /components
  - Chat.tsx                  (shell: header, thread sidebar, footer, theme toggle)
  - MessageList.tsx           (renders messages w/ streaming)
  - MessageItem.tsx           (single message + hover toolbar)
  - Composer.tsx              (expandable textarea + actions)
  - TypingDots.tsx
  - ThreadSidebar.tsx
  - ThemeToggle.tsx
  - Skeleton.tsx
- /lib
  - openai.ts                 (server-side OpenAI client)
  - stream.ts                 (helpers to turn OpenAI stream into web stream)
  - store.ts                  (localStorage helpers for threads)
  - types.ts                  (Thread, Message types)
  - rag.ts                    (helpers to include vector store/file_search)
- /scripts
  - seed-vector-store.ts      (optional: create & upload files; prints VECTOR_STORE_ID)
- /public
  - favicon.ico, og assets, etc
- .env.example
- next.config.mjs
- tailwind.config.ts (optional but recommended)
- postcss.config.mjs
- tsconfig.json
- eslint + prettier config

──────────
Key implementation details
──────────
• OpenAI client (Node SDK):
  - Use the Responses API with streaming.
  - Model: "gpt-5-nano".
  - Provide a "system" preface like: “You are a helpful assistant. Be concise and accurate. If RAG is enabled, cite internal knowledge briefly (no URLs).”
• /app/api/chat/route.ts (Edge runtime):
  - Parse JSON: { messages: [{role, content}], useRag?: boolean }.
  - Build a Responses request:
      {
        model: "gpt-5-nano",
        input: messages,  // array with system + user + (optional) assistant turns
        stream: true,
        ...(useRag && process.env.VECTOR_STORE_ID
          ? { tools: [{ type: "file_search" }], // and attach vector store per docs
              // If attachments are required by the SDK shape, add them accordingly.
            }
          : {})
      }
  - Return a web ReadableStream that forwards chunks as they arrive.
• Client-side streaming:
  - fetch("/api/chat", { method: "POST", body: JSON.stringify(payload) })
  - Read the body as a stream with a reader; append tokens to last assistant msg.
  - If the user clicks Regenerate on a message, resend the same context from that point.
• Local threads:
  - store.ts exports getThreads, saveThreads, createThread, addMessage(threadId, msg), etc.
  - On first send in a new thread, set title to the first user message (truncate 40 chars).
• Theme:
  - CSS variables for both themes in :root[data-theme="dark"] and :root[data-theme="light"].
  - Use PT Serif (Google Fonts) everywhere.
• Accessibility:
  - Respect prefers-reduced-motion (disable fancy animations).
  - ARIA roles for buttons; focus states visibly distinct.

──────────
Env & config
──────────
- .env
  OPENAI_API_KEY=sk-xxxx
  VECTOR_STORE_ID=vs_XXXX   # optional
- Do NOT expose the key to the browser. The only place that touches OPENAI_API_KEY is server code.

──────────
Packages & scripts
──────────
- Dependencies: next, react, react-dom, openai, zod
- Dev: typescript, @types/node, @types/react, eslint, prettier, tailwindcss, postcss, autoprefixer
- Scripts: dev, build, start, lint, seed:vector (runs /scripts/seed-vector-store.ts)

──────────
Acceptance criteria
──────────
- Cold load < 200KB JS (excluding Next runtime where feasible); no heavy UI libs.
- First message round-trip starts streaming within ~300–600ms on Vercel Edge.
- Light/dark theme toggle persists (prefers-color-scheme default).
- No server persistence (no DB, no file writes). Only localStorage for threads.
- If VECTOR_STORE_ID exists and “Use knowledge base” is ON, model uses file_search on the attached store.

Now generate the whole repo. Create all files with complete, working code (no TODOs). Keep code clean and well-commented. Ensure `pnpm dev` works instantly after `pnpm i`.