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
- **Prisma + PostgreSQL** for the data layer. Uses a hosted Prisma Postgres database (via `create-db`) so the app runs with zero local database setup — swap `DATABASE_URL` for any other Postgres instance if preferred.
- **Tailwind CSS + shadcn/ui** for styling and UI primitives.
- **TypeScript strict mode** throughout; explicit types at module boundaries.
- **Testing strategy** (Vitest): integration tests are prioritized around order creation (total cost + estimated ready-date calculation) since that's the core business logic; pure helpers get unit tests; end-to-end tests are skipped given the time budget.

More rationale will be added here as design decisions are made during implementation. See `AGENTS.md` for the underlying engineering conventions this project follows.

### Data model

Four models in `prisma/schema.prisma`: `Patient`, `LabTest` (the catalog), `Order`, and `OrderTest` (a join table representing each test line item on an order).

**Why `OrderTest` is its own model, not an implicit many-to-many.**
An order can include multiple tests, and the same test can appear on multiple orders — a classic many-to-many. Prisma supports implicit many-to-many tables, but those can only hold the two foreign keys; they can't carry extra columns. Since we need to snapshot `priceAtOrder` and `turnaroundDaysAtOrder` per line item (see below), the join has to be an explicit model we own.

**Why snapshot price/turnaround on the line item instead of always reading live from the catalog.**
Once an order is placed, it should be treated as a historical record — what the patient was actually charged and told to expect. If we always joined to the live `LabTest` row instead, editing a test's price in the catalog next month would silently rewrite the cost of every past order that used it, which is both incorrect (that's not what the patient paid) and dangerous for anything resembling a billing/audit trail. Copying `price` and `turnaroundDays` onto `OrderTest` at creation time freezes them. The trade-off is a small amount of data duplication, which is the right side of that trade-off for financial/medical records.

We didn't bother storing a separate per-line-item ready date, though — `order.createdAt + turnaroundDaysAtOrder` is a one-line addition, so persisting it would just be redundant data with nothing gained.

**Why `totalCost` and `readyDate` live on `Order` itself, computed once, rather than derived on every read.**
The alternative — never storing them, and summing/maxing over `OrderTest` rows every time an order is displayed — avoids any denormalization, but it means the order list (and any filter/sort/search on cost or ready date) has to aggregate line items on every single request instead of reading a plain column. Since these values are fixed the moment an order is placed (they shouldn't change afterwards — see snapshotting above), persisting them costs nothing in correctness and buys simpler, faster, indexable queries. The risk with denormalized fields is normally "the stored value can drift from the truth," but that risk is contained here because there's exactly one function that computes them (at order-creation time), which is also the function this project's test suite is centered on per `AGENTS.md`.

**Why `readyDate = createdAt + MAX(turnaround)` and not `SUM(turnaround)`.**
If an order has a CBC (1-day turnaround) and a genetic panel (10-day turnaround), the realistic assumption is that a lab runs both simultaneously — the order isn't "ready" until the slowest test finishes, not after 11 cumulative days. `SUM` would model tests being processed one after another on a single track, which doesn't match how a lab actually batches work.

**Why `OrderStatus` is an enum, not a free-text string.**
An enum is enforced at the database level, so an invalid status (a typo, or a status that was renamed at the application layer but not the database) simply can't be written. It also documents the entire set of valid states in one place (`prisma/schema.prisma`) instead of that knowledge living only in application code or, worse, in several inconsistent places. `PENDING → IN_PROGRESS → COMPLETED` models the normal lifecycle; `CANCELLED` is a side-exit from any of those states.

**Why `Decimal`, not `Float` or `Int`, for money.**
`Float`/`Decimal` in JavaScript/floating point can misrepresent money (`0.1 + 0.2 !== 0.3`), which is unacceptable for prices and totals that get summed. `Decimal` (mapped to Postgres `NUMERIC(10, 2)`) stores exact base-10 values. The alternative some teams use — storing cents as an `Int` — avoids the JS float issue too, but pushes cents/dollars conversion logic into every place money is displayed or entered; `Decimal` keeps the unit as "dollars" everywhere and lets Prisma/Postgres handle precision.

**Why `cuid()` ids instead of auto-increment integers.**
A `cuid()` can be generated on the client/application side before the row is ever written, which matters for things like generating an order and its line items together in one place without a round-trip to the database first to learn the new row's id. Auto-increment ints are simpler but require the insert to happen first to know the id, and they leak information about record counts/creation order (`Order #4` implies this is only the 4th order ever placed) — irrelevant for a take-home, but a real habit worth defaulting to.

**Why `Restrict` on `Patient`/`LabTest` deletes, but `Cascade` on `Order → OrderTest`.**
`OrderTest` rows have no meaning without their parent `Order` — deleting an order should delete its line items, full stop, so that relationship cascades. A `Patient` or `LabTest` that's referenced by an existing order is different: deleting either out from under an order would either orphan the order or silently destroy a piece of its history. `Restrict` forces that conflict to be handled explicitly (e.g. the UI would need a "this patient has orders and can't be deleted" flow) rather than allowing it to happen implicitly.

**Indexes.** `Patient` is indexed on `(lastName, firstName)` since patient search/lookup is a listed feature. `Order` is indexed on `patientId`, `status`, and `createdAt` since the order list needs to filter by patient and status and will typically be sorted by recency — all listed requirements in the brief.

## Known Limitations & What I'd Improve With More Time

- The database schema exists and is migrated, but the app's UI/API (Patients, Lab Test Catalog, Orders features) are not yet implemented.
- The schema doesn't enforce that a `Patient` has at least one of email/phone at the database level — that validation belongs at the application layer, not yet written.
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
