# Codex Supplement

This workspace uses a trimmed `everything-claude-code` setup tuned for a Next.js 16 / TypeScript product repo.

## Default Approach

- Use local project evidence before general assumptions.
- For framework or API questions, prefer the `documentation-lookup` skill.
- For non-trivial changes, tighten the loop with `tdd-workflow`, `verification-loop`, and `security-review`.
- Use `frontend-patterns` for React/App Router work and `backend-patterns` for route handlers, storage, and service logic.

## Installed Skills

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

## Multi-Agent Roles

Project-local roles are available in `.codex/agents/`:

- `explorer`: read-only codebase tracing
- `reviewer`: correctness and regression review
- `docs_researcher`: documentation verification

## Verification Bias

Before finishing substantial changes, prefer:

1. `npm run test:unit`
2. `npm run build`
3. `npm run test:e2e` for user-flow changes

Escalate checks when touching auth, token generation, file handling, storage, or public API routes.
