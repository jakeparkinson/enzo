# Lab Orders Lite

A small system for managing Patients, Lab Tests, and Orders.

## Setup & Running Locally

**1. Install dependencies**

```bash
npm install
```

**2. Set up a Postgres database**

Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres connection string:

```bash
cp .env.example .env
```

The fastest option is a free hosted Postgres database (no local install required):

```bash
npx create-db
```

This prints a connection string — paste it into `.env` as `DATABASE_URL`. (Alternatively, point `DATABASE_URL` at any local or existing Postgres instance.)

**3. Sync the database schema**

```bash
npx prisma db push
```

**4. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

**Other commands:**

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (run once)
npm run test:watch # Vitest (watch mode)
npx prisma studio  # Browse/edit database data in a GUI
```

## Architecture & Design Decisions

- **Next.js (App Router)** for the app shell and routing.
- **API Route Handlers** (not Server Actions) for all mutations and data access, keeping the client/server boundary explicit and easy to test.
- **Prisma + PostgreSQL** for the data layer *(schema not yet implemented)*. Uses a hosted Prisma Postgres database (via `create-db`) so the app runs with zero local database setup — swap `DATABASE_URL` for any other Postgres instance if preferred.
- **Tailwind CSS + shadcn/ui** for styling and UI primitives.
- **TypeScript strict mode** throughout; explicit types at module boundaries.
- **Testing strategy** (Vitest): integration tests are prioritized around order creation (total cost + estimated ready-date calculation) since that's the core business logic; pure helpers get unit tests; end-to-end tests are skipped given the time budget.

More rationale will be added here as design decisions are made during implementation. See `AGENTS.md` for the underlying engineering conventions this project follows.

## Known Limitations & What I'd Improve With More Time

- The app is currently just the project scaffold (tooling, conventions, testing setup) — Patients, Lab Test Catalog, and Orders features are not yet implemented.
- This section will be kept up to date with real limitations and trade-offs as the app is built.

---

# Original Assignment Brief

Thanks for taking the time to work on this! This exercise is designed to give us insight into how you approach building applications, organizing code, and making trade-offs.

You’ll build a small app. You are free to use any technology stack you prefer. We’ll then meet in person to discuss your choices and extend the app together.

---

## The Project: “Lab Orders Lite”

We’d like you to build a simple system for managing **Patients**, **Lab Tests**, and **Orders**. Think of it like a mini clinic app.

### Example features you might include:

- Create and update **Patients** (name, date of birth, contact info).
- Manage a **Lab Test Catalog** (code, name, price, turnaround time).
- Create an **Order** for a patient with one or more tests.
- Display the **total cost** and an **estimated ready date** (based on turnaround time).
- Show a list of orders, with filtering or searching (e.g., by patient or status).

You don’t need to do everything perfectly—focus on a meaningful slice that shows how you think.

---

## What We’re Looking For

- **Code organization** – Is the structure clear and maintainable?
- **Architecture decisions** – How did you separate concerns and manage complexity?
- **Testing** – Show us your testing discipline (unit, integration, or end-to-end—your choice).
- **Clarity** – A README that explains setup and design choices.
- **Trade-offs** – Tell us where you cut scope and why.

---

## Deliverables

- A working app we can run locally.
- A short **README** including:
  - How to set up and run the app
  - Overview of your architecture/design decisions
  - Known limitations and what you’d improve with more time

---

## In-Person Follow-Up

When we meet, we’ll:

- Walk through your solution and discuss your approach.
- Explore your code organization and testing.
- Make some modifications to the app together.

---

## Notes

- Keep it small but thoughtful. A polished core is better than unfinished breadth.
- **AI tools are allowed** If you use them, be prepared to explain where and how, and what you changed.
- Target effort: about **5–8 hours**.

---

👉 We’re more interested in your **thinking process** than in pixel-perfect UI or feature completeness.

Good luck, and we look forward to seeing what you build! 🚀
