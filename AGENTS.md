# MyReal Agent Instructions

This repository uses a project-local adaptation of the `everything-claude-code` workflow for Codex.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Vitest + Playwright
- Supabase / S3-compatible storage integrations

## Working Rules

1. Plan before substantial multi-file changes.
2. Prefer small, focused edits over broad rewrites.
3. Validate behavior at the boundary: API inputs, env vars, storage responses, token handling.
4. Keep secrets out of code and logs.
5. Run the smallest meaningful verification loop before finishing.

## Project Priorities

- Preserve the core flow: draw or upload image -> generate character -> open AR view -> capture/share.
- Do not regress token expiry, retention cleanup, admin auth, or storage abstraction behavior.
- Treat image generation fallbacks as production paths, not edge cases.
- Keep mobile behavior and non-WebXR fallback working.

## Verification

Use the narrowest relevant checks first, then expand if the change is broad.

- `npm run test:unit`
- `npm run test:e2e`
- `npm run build`
- `npm run lint`

## High-Value Paths

- `app/` UI routes and API handlers
- `app/components/` drawing, upload, AR, and feedback flows
- `lib/` token, storage, generation, queue, security, and config logic
- `scripts/cleanup.ts` retention enforcement

## ECC Skills Available Locally

Codex can use project-local skills from `.agents/skills/`, including:

- `coding-standards`
- `frontend-patterns`
- `backend-patterns`
- `tdd-workflow`
- `verification-loop`
- `security-review`
- `e2e-testing`
- `nextjs-turbopack`
- `documentation-lookup`
- `strategic-compact`

Also consult `.codex/AGENTS.md` for Codex-specific guidance and agent-role setup.
