import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/lib/generated/prisma/client";
import { getOrders } from "./get-orders";

/**
 * Integration tests for `getOrders` against a real Postgres database (the
 * one configured via `DATABASE_URL`), since its whole job is building and
 * running a Prisma query — a unit test with a mocked client wouldn't catch
 * real query bugs (e.g. the patient-name sort tiebreak this test suite now
 * guards against).
 *
 * Fixtures are tagged with a random run id and every assertion scopes its
 * `getOrders` call to that tag (via `patientQuery`), so these tests are safe
 * to run against a shared dev database alongside seeded demo data, and safe
 * to run more than once without colliding with leftover rows.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);
const lastName = (suffix: string) => `Ztest${RUN_ID}${suffix}`;

describe("getOrders (integration)", () => {
  let orderSlow: string;
  let orderMedium: string;
  let orderFast: string;
  const patientIds: string[] = [];
  const labTestIds: string[] = [];
  const orderIds: string[] = [];

  beforeAll(async () => {
    const dob = new Date("1990-01-01");

    const [slowTest, mediumTest, fastTest] = await Promise.all([
      prisma.labTest.create({
        data: { code: `SLOW-${RUN_ID}`, name: "Slow Test", price: "200.00", turnaroundDays: 20 },
      }),
      prisma.labTest.create({
        data: { code: `MED-${RUN_ID}`, name: "Medium Test", price: "50.00", turnaroundDays: 5 },
      }),
      prisma.labTest.create({
        data: { code: `FAST-${RUN_ID}`, name: "Fast Test", price: "10.00", turnaroundDays: 1 },
      }),
    ]);
    labTestIds.push(slowTest.id, mediumTest.id, fastTest.id);

    // pA/pB share a last name on purpose, to exercise the firstName tiebreak.
    const [pA, pB, pC] = await Promise.all([
      prisma.patient.create({
        data: { firstName: "Amy", lastName: lastName(""), dateOfBirth: dob },
      }),
      prisma.patient.create({
        data: { firstName: "Bob", lastName: lastName(""), dateOfBirth: dob },
      }),
      prisma.patient.create({
        data: { firstName: "Cara", lastName: lastName("Extra"), dateOfBirth: dob },
      }),
    ]);
    patientIds.push(pA.id, pB.id, pC.id);

    const daysAgo = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    };

    const [orderA, orderB, orderC] = await Promise.all([
      prisma.order.create({
        data: {
          patientId: pA.id,
          status: OrderStatus.PENDING,
          totalCost: "200.00",
          readyDate: new Date(daysAgo(3).getTime() + 20 * 86_400_000),
          createdAt: daysAgo(3),
          tests: { create: [{ labTestId: slowTest.id, priceAtOrder: "200.00", turnaroundDaysAtOrder: 20 }] },
        },
      }),
      prisma.order.create({
        data: {
          patientId: pB.id,
          status: OrderStatus.COMPLETED,
          totalCost: "50.00",
          readyDate: new Date(daysAgo(2).getTime() + 5 * 86_400_000),
          createdAt: daysAgo(2),
          tests: { create: [{ labTestId: mediumTest.id, priceAtOrder: "50.00", turnaroundDaysAtOrder: 5 }] },
        },
      }),
      prisma.order.create({
        data: {
          patientId: pC.id,
          status: OrderStatus.IN_PROGRESS,
          totalCost: "10.00",
          readyDate: new Date(daysAgo(1).getTime() + 1 * 86_400_000),
          createdAt: daysAgo(1),
          tests: { create: [{ labTestId: fastTest.id, priceAtOrder: "10.00", turnaroundDaysAtOrder: 1 }] },
        },
      }),
    ]);
    orderSlow = orderA.id; // pA, PENDING, cost 200, readyDate furthest out, oldest createdAt
    orderMedium = orderB.id; // pB, COMPLETED, cost 50, readyDate in the middle
    orderFast = orderC.id; // pC, IN_PROGRESS, cost 10, readyDate soonest, newest createdAt
    orderIds.push(orderSlow, orderMedium, orderFast);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    await prisma.labTest.deleteMany({ where: { id: { in: labTestIds } } });
  });

  it("filters by status", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID, status: OrderStatus.COMPLETED });

    expect(orders.map((o) => o.id)).toEqual([orderMedium]);
  });

  it("filters by patientQuery against first name, case-insensitively", async () => {
    const orders = await getOrders({ patientQuery: "amy" });
    const ids = orders.map((o) => o.id).filter((id) => orderIds.includes(id));

    expect(ids).toEqual([orderSlow]);
  });

  it("filters by patientQuery against last name, matching all patients sharing it", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID });

    expect(orders.map((o) => o.id).sort()).toEqual([orderSlow, orderMedium, orderFast].sort());
  });

  it("sorts by patient last name, breaking ties on first name", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID, sortBy: "patient", sortDir: "asc" });

    // pA (Amy) and pB (Bob) share a last name — must be broken by first name,
    // not left in an arbitrary/database-default order.
    expect(orders.map((o) => o.id)).toEqual([orderSlow, orderMedium, orderFast]);
  });

  it("sorts by patient last name descending", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID, sortBy: "patient", sortDir: "desc" });

    expect(orders.map((o) => o.id)).toEqual([orderFast, orderMedium, orderSlow]);
  });

  it("sorts by totalCost ascending", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID, sortBy: "totalCost", sortDir: "asc" });

    expect(orders.map((o) => o.id)).toEqual([orderFast, orderMedium, orderSlow]);
  });

  it("sorts by readyDate descending", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID, sortBy: "readyDate", sortDir: "desc" });

    // readyDate order is deliberately the reverse of createdAt order here,
    // so this fails if the query accidentally sorted by createdAt instead.
    expect(orders.map((o) => o.id)).toEqual([orderSlow, orderMedium, orderFast]);
  });

  it("defaults to createdAt descending when no sort is specified", async () => {
    const orders = await getOrders({ patientQuery: RUN_ID });

    expect(orders.map((o) => o.id)).toEqual([orderFast, orderMedium, orderSlow]);
  });
});
