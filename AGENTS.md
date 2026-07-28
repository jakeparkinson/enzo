<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Conventions

## Stack

- **Next.js** (App Router) — read local Next docs before coding
- **API routes** — use Route Handlers for mutations and data access
- **TypeScript** — strict; no `any` unless justified and narrow
- **Prisma** + **PostgreSQL** — schema and data access
- **Tailwind CSS** + **shadcn/ui** — styling and components

## Design

- Apply solid programming design practices: clear separation of concerns, small focused modules, predictable data flow.
- Keep files lean. If a file is growing large or mixing responsibilities, split it.
- Avoid premature abstraction and over-engineering; keep the core simple and maintainable.

## Quality gates

Before considering work done, ensure:

1. **Tests** — prioritize integration tests around order creation (cost + ready-date calculation) since that's the core business logic; unit test pure helpers; skip e2e given time budget. I will manually test with browser.
2. **Lint** passes (`eslint` / project lint script).
3. **TypeScript** checks pass (`tsc` / `next build` typecheck — no type errors).

Do not ship changes that break lint, types, or existing tests. Add or update tests with behavior changes.

## Code style

- Match existing project patterns once they exist.
- Name things for the domain, not generic placeholders.
- Prefer explicit types at module boundaries; keep UI components thin.
- Use shadcn components where they fit; do not reinvent common UI primitives.

## Documentation

- Maintain a README with: setup/run instructions, architecture overview, and known limitations / what you'd improve with more time.
- Keep design-decision rationale in the README, not scattered in code comments.
