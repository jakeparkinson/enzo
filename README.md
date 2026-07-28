# Lab Orders Lite

A small system for managing Patients, Lab Tests, and Orders.

## Features

- **Orders** (`/`) — list all orders, filter by patient name or status, sort any column; create a new order for a patient with one or more catalog tests, with total cost and estimated ready date computed automatically.
- **Patients** (`/patients`) — list all patients; create and edit a patient's name, date of birth, and contact info (email and/or phone).
- **Lab Test Catalog** (`/lab-tests`) — list all catalog tests; create, edit, and delete entries (code, name, price, turnaround days). A test in use by an existing order can't be deleted.

## Setup & Running Locally

**1. Install dependencies**

```bash
npm install
```

This also runs `prisma generate` automatically (via a `postinstall` script), which generates the Prisma Client into `lib/generated/prisma`. That folder is gitignored and required by nearly every server-side file in this project, so it must exist before `npm run dev` (or anything else) will work — the `postinstall` hook exists specifically so a fresh clone doesn't require an extra manual step here.

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

**3. Apply migrations and seed the database**

```bash
npx prisma migrate dev
```

This applies the committed migrations in `prisma/migrations/` to your database, then automatically runs `prisma/seed.ts` (configured via `migrations.seed` in `prisma.config.ts`), which creates a handful of sample patients, catalog tests, and orders so the dashboard has something to show immediately. The seed script is safe to re-run any time (`npm run db:seed`) — it skips creating patients/tests/orders that already exist rather than duplicating them.

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
npm run db:seed    # Re-run the seed script (safe to run multiple times)
npx prisma generate # Regenerate the Prisma Client (e.g. after pulling schema changes)
npx prisma studio  # Browse/edit database data in a GUI
```

## Architecture & Design Decisions

- **Next.js (App Router)** for the app shell and routing.
- **API Route Handlers** (not Server Actions) for all mutations and data access, keeping the client/server boundary explicit and easy to test.
- **Prisma + PostgreSQL** for the data layer. Uses a hosted Prisma Postgres database (via `create-db`) so the app runs with zero local database setup — swap `DATABASE_URL` for any other Postgres instance if preferred.
- **Tailwind CSS + shadcn/ui** for styling and UI primitives.
- **TypeScript strict mode** throughout; explicit types at module boundaries.
- **Testing strategy** (Vitest): integration tests are prioritized around the core business logic; pure helpers get unit tests; end-to-end tests are skipped given the time budget.
  - `lib/orders/calculate-order-totals.test.ts` — unit tests for the pure total-cost/ready-date helper.
  - `lib/orders/get-orders.test.ts` — integration tests that run the real filtering/sorting query against Postgres (via `DATABASE_URL`), including a regression test for sorting by patient name. Fixtures are tagged with a random run id and every query is scoped to that tag, so it's safe to run repeatedly against the same shared dev database without colliding with seed data or leftover rows from a previous run.
  - `lib/orders/create-order.test.ts` — integration tests for order creation: totalCost/readyDate computed and persisted correctly (single test, multiple tests using MAX turnaround), price/turnaround snapshotting surviving later catalog edits, duplicate test ids being deduplicated, and unknown patient/test ids being rejected. Same tagging/cleanup approach as above.
  - `app/api/orders/route.test.ts` — tests both route handlers' request validation and delegation with `getOrders`/`createOrder` mocked, since real query/creation correctness is already covered by the integration tests above.
  - `lib/lab-tests/parse-lab-test-input.test.ts` — unit tests for the pure request-body validator shared by the create/edit catalog endpoints.
  - `lib/lab-tests/create-lab-test.test.ts`, `update-lab-test.test.ts`, `delete-lab-test.test.ts` — integration tests against Postgres for each catalog mutation: duplicate-code rejection, unknown-id rejection, the snapshotting guarantee surviving a catalog edit, and (for delete) refusing to remove a test still referenced by an order. Same tagging/cleanup approach as the orders integration tests.
  - `app/api/lab-tests/route.test.ts`, `app/api/lab-tests/[id]/route.test.ts` — route handler validation/delegation tests with the mutation functions mocked, mirroring `app/api/orders/route.test.ts`.
  - `lib/patients/parse-patient-input.test.ts` — unit tests for the pure request-body validator (including the date-of-birth format/future-date checks and the "at least one of email/phone" rule).
  - `lib/patients/create-patient.test.ts`, `update-patient.test.ts` — integration tests against Postgres for the two patient mutations.
  - `app/api/patients/route.test.ts`, `app/api/patients/[id]/route.test.ts` — route handler validation/delegation tests with the mutation functions mocked.

See `AGENTS.md` for the underlying engineering conventions this project follows.

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

### Lab Test Catalog management

The `/lab-tests` page and its `GET/POST /api/lab-tests` + `PATCH/DELETE /api/lab-tests/[id]` endpoints let staff add, edit, and remove catalog entries (code, name, price, turnaround days). A top nav (`components/site-nav.tsx`) was added to `app/layout.tsx` once there was more than one page to link between; it now covers all three (Orders, Patients, Lab Test Catalog).

**Why `PATCH` is a full replace of all four fields, not a partial update.** A real partial-update `PATCH` (only touching whichever fields are present in the body) adds real complexity — distinguishing "field omitted" from "field explicitly cleared" in the JSON body, and building the corresponding Prisma `data` object dynamically. The edit dialog always has and submits all four fields anyway (it's a small, fully-loaded form, not a bulk/API-first editing surface), so there's no actual use case for partial updates here. Sending the complete object keeps the request shape identical to `POST`, which is why both routes share one `parseLabTestInput` validator.

**Why code uniqueness and the delete-when-in-use rule are checked explicitly in the mutation functions, not by catching Prisma's constraint-violation error codes.** `code` is `@unique` in the schema and `OrderTest.labTest` is `onDelete: Restrict` (see above), so the database would reject an invalid create/update/delete either way. But catching `P2002`/`P2003` afterwards means inferring which constraint fired from an opaque error code, and it fires only after the write was attempted. Querying first (`findUnique` by code before create/update; `orderTest.count` before delete) costs one extra round-trip but keeps the check readable and produces the exact same user-facing 409 the schema constraint exists to prevent — consistent with how `createOrder` already validates patient/test ids up front rather than reacting to a foreign-key failure.

**Why the catalog is normalized to an uppercase, trimmed `code`.** Codes are short mnemonic identifiers (`CBC`, `TSH`, ...), effectively the catalog's human-facing primary key. Without normalization, `"cbc"` and `"CBC"` would pass the database's uniqueness check as two different rows, which is almost certainly a data-entry accident, not an intentional distinction — normalizing at the validation boundary (`parseLabTestInput`) closes that gap for both create and edit.

**Why deleting a lab test is blocked instead of soft-deleted.** Given the `Restrict` FK relationship already forces this decision at the schema level (see above), the UI/API just surfaces it clearly (a specific 409 message) rather than trying to route around it with a soft-delete flag, which would add a new column and a "is this test still available to order?" filter everywhere the catalog is read, for a feature not in scope.

### Patient management

The `/patients` page and its `GET/POST /api/patients` + `PATCH /api/patients/[id]` endpoints let staff register new patients and correct their name/DOB/contact info. Unlike the Lab Test Catalog, there's no delete — it wasn't asked for, and a `Patient` referenced by an order is `Restrict`-protected at the schema level anyway (see above), so deleting one meaningfully would need the same kind of in-use guard as `LabTest` deletion for no requested benefit.

**Why `GET /api/patients` now returns full patient records instead of just the picker's `{id, firstName, lastName}`.** Before this feature, the endpoint only backed the new-order patient picker, so `PatientOptionDto` deliberately excluded contact info. Now that there's a real "list all patients" page, that's the more natural shape for the one list endpoint to return — a second endpoint/query for what's otherwise the same table and ordering would just be duplication. `PatientOptionDto` still exists as the narrower type the picker component actually reads (structurally compatible with the fuller response), documenting that the picker doesn't need the extra fields even though they're now present on the wire.

**Why the app-layer "at least one of email or phone" rule lives in `parsePatientInput`, not a database constraint.** Earlier versions of this README called this out as a known limitation — it's resolved now, but still at the application layer rather than the schema. A `CHECK` constraint could enforce it in Postgres, but Prisma's schema DSL can't express "at least one of these two nullable columns is non-null" declaratively (it would need a raw SQL migration), and the rule is a product/data-quality judgment call ("a patient a clinic can't reach isn't useful data") rather than a structural invariant of the data itself, which is exactly the kind of rule that belongs in application validation rather than the schema.

**Why date-of-birth is deliberately kept on the UTC-midnight code path end-to-end.** A `<input type="date">` gives a plain `"YYYY-MM-DD"` string with no timezone; parsing it with `new Date("1990-01-01")` (not `new Date(year, month, day)`) always yields UTC midnight, which is also how Prisma reads a `@db.Date` column back. Rendering it, in turn, uses a dedicated `formatDateOfBirth` (pinned to `timeZone: "UTC"`) rather than the existing `formatDate` used for order timestamps. Mixing the two — e.g. formatting a date-of-birth with a local-timezone formatter — is a classic source of an off-by-one-day bug for anyone west of UTC, so the two helpers are kept intentionally separate rather than reusing one "format a date" function for both a pure calendar date and an actual timestamp.

## Known Limitations & What I'd Improve With More Time

- The new-order form's patient and test pickers are a plain dropdown/checklist, fine for a handful of seeded records but wouldn't scale to a large patient roster — a searchable combobox would be the next step.
- The Lab Test Catalog and Patients pages have no search/filter/sort controls (unlike the orders list) — a reasonable trade-off while both are a handful of rows, but worth adding (a name/code search box) if either were expected to grow to dozens/hundreds of rows.
- There's no patient delete, matching the brief (which only asks for create/update) and the `Restrict` relationship on `Order.patient` — if it were added later, it'd need the same "reject if referenced by an order" guard `deleteLabTest` already implements.
- An order's status can only be set at creation (defaults to `PENDING`) and filtered on in the list — there's no way to transition it (e.g. to `IN_PROGRESS`/`COMPLETED`/`CANCELLED`) from the UI or API yet. This was cut for scope; it'd be a small addition (a `PATCH /api/orders/[id]` restricted to just the `status` field) but wasn't part of the brief's example feature list.
- None of the three list views (orders, lab tests, patients) paginate — they load and render every row in one request. Fine at seed-data scale; a real deployment would need cursor- or offset-based pagination on all three before the row count grew large.
- There's no authentication/authorization — every page and API route is open to anyone who can reach the server. Reasonable for a local take-home exercise, but the first thing to add before this touched real patient data.
- The integration tests run against the same `DATABASE_URL` as local dev (there's no separate test database). This is safe today because fixtures are tagged per test run and cleaned up afterward, but a real CI setup would use an isolated test database instead.

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
