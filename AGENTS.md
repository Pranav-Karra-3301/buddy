# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router. Define routes by folder; each route contains `page.tsx` and optional `layout.tsx`. Global styles live in `src/app/globals.css` (Tailwind CSS v4).
- `public/`: Static assets served at the web root (e.g., `/favicon.ico`).
- Config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json` (TypeScript `strict: true`, path alias `@/* → src/*`).
- Env: use `.env.local` for local secrets; example keys may live in `.env.example`.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server at `http://localhost:3000`.
- `npm run build`: Production build (`.next/`). Validates types and bundles the app.
- `npm start`: Run the production server from the built output.
- `npm run lint`: Run ESLint with the Next.js config.

## Coding Style & Naming Conventions
- **Language**: TypeScript, React 19, Next.js 15 (App Router). Prefer functional components and hooks.
- **Formatting**: 2‑space indentation, single source of truth is ESLint (`next/core-web-vitals`, TypeScript rules). Fix lint issues before pushing.
- **Naming**: Components `PascalCase` (e.g., `Button.tsx`); hooks `useX`; route files follow Next conventions (`page.tsx`, `layout.tsx`). Import via `@/…` alias.
- **Styling**: Tailwind utility classes in JSX; avoid unused CSS. Keep class lists readable and grouped logically.

## Testing Guidelines
- Tests are not yet configured. Recommended: unit tests with Vitest + React Testing Library; E2E with Playwright.
- Suggested scripts (once added): `npm test` (unit) and `npm run test:e2e` (E2E). Keep tests alongside code or under `tests/`.

## Commit & Pull Request Guidelines
- **Commits**: Use present‑tense, imperative mood; keep changes scoped. Conventional Commits (e.g., `feat:`, `fix:`, `chore:`) are encouraged.
- **PRs**: Include a clear description, rationale, and scope. Link issues using `Closes #123`. Add screenshots for UI changes. Ensure `npm run lint` and `npm run build` pass. Note any config or ENV changes.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` (git‑ignored). For client‑exposed values, prefix with `NEXT_PUBLIC_`.
- Validate env changes locally before deploying. Rotate credentials if leaked.
