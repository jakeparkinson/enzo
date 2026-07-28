import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { OrderStatus, type LabTest, type Patient } from "@/lib/generated/prisma/client";
import { calculateOrderTotals } from "@/lib/orders/calculate-order-totals";

const patients = [
  {
    firstName: "Alice",
    lastName: "Nguyen",
    dateOfBirth: new Date("1988-03-14"),
    email: "alice.nguyen@example.com",
    phone: "555-0101",
  },
  {
    firstName: "Marcus",
    lastName: "Bailey",
    dateOfBirth: new Date("1975-11-02"),
    email: "marcus.bailey@example.com",
    phone: "555-0102",
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    dateOfBirth: new Date("1994-07-22"),
    email: "priya.sharma@example.com",
    phone: null,
  },
  {
    firstName: "James",
    lastName: "Sullivan",
    dateOfBirth: new Date("1962-01-30"),
    email: null,
    phone: "555-0104",
  },
];

const labTests = [
  {
    code: "CBC",
    name: "Complete Blood Count",
    price: "24.99",
    turnaroundDays: 1,
  },
  {
    code: "LIPID",
    name: "Lipid Panel",
    price: "39.5",
    turnaroundDays: 2,
  },
  {
    code: "TSH",
    name: "Thyroid Stimulating Hormone",
    price: "45.0",
    turnaroundDays: 3,
  },
  {
    code: "GLUC",
    name: "Fasting Glucose",
    price: "15.75",
    turnaroundDays: 1,
  },
  {
    code: "GENPANEL",
    name: "Hereditary Genetic Panel",
    price: "299.0",
    turnaroundDays: 10,
  },
];

async function main() {
  const existingPatients = await prisma.patient.count();
  if (existingPatients > 0) {
    console.log(
      `Skipping patient/catalog seeding: ${existingPatients} patient(s) already exist.`
    );
    const createdPatients = await prisma.patient.findMany({
      orderBy: { createdAt: "asc" },
    });
    const createdLabTests = await prisma.labTest.findMany({
      orderBy: { createdAt: "asc" },
    });
    return seedOrdersIfNeeded(createdPatients, createdLabTests);
  }

  console.log("Seeding patients...");
  const createdPatients = await Promise.all(
    patients.map((patient) => prisma.patient.create({ data: patient }))
  );

  console.log("Seeding lab test catalog...");
  const createdLabTests = await Promise.all(
    labTests.map((test) =>
      prisma.labTest.upsert({
        where: { code: test.code },
        update: {},
        create: test,
      })
    )
  );

  await seedOrdersIfNeeded(createdPatients, createdLabTests);
}

async function seedOrdersIfNeeded(
  seededPatients: Patient[],
  seededLabTests: LabTest[]
) {
  const existingOrders = await prisma.order.count();
  if (existingOrders > 0) {
    console.log(
      `Skipping order seeding: ${existingOrders} order(s) already exist.`
    );
    return;
  }

  if (seededPatients.length < 4 || seededLabTests.length < 5) {
    console.log("Not enough patients/lab tests to seed sample orders.");
    return;
  }

  const [alice, marcus, priya, james] = seededPatients;
  const [cbc, lipid, tsh, gluc, genPanel] = seededLabTests;

  console.log("Seeding orders...");
  const orderPlans: {
    patientId: string;
    status: OrderStatus;
    createdAt: Date;
    tests: LabTest[];
  }[] = [
    {
      patientId: alice.id,
      status: OrderStatus.COMPLETED,
      createdAt: daysAgo(14),
      tests: [cbc, gluc],
    },
    {
      patientId: marcus.id,
      status: OrderStatus.IN_PROGRESS,
      createdAt: daysAgo(5),
      tests: [lipid, tsh],
    },
    {
      patientId: priya.id,
      status: OrderStatus.PENDING,
      createdAt: daysAgo(1),
      tests: [genPanel],
    },
    {
      patientId: james.id,
      status: OrderStatus.CANCELLED,
      createdAt: daysAgo(20),
      tests: [cbc],
    },
    {
      patientId: alice.id,
      status: OrderStatus.PENDING,
      createdAt: daysAgo(0),
      tests: [tsh, gluc, lipid],
    },
  ];

  for (const plan of orderPlans) {
    const { totalCost, readyDate } = calculateOrderTotals(
      plan.tests.map((t) => ({
        price: t.price,
        turnaroundDays: t.turnaroundDays,
      })),
      plan.createdAt
    );

    await prisma.order.create({
      data: {
        patientId: plan.patientId,
        status: plan.status,
        totalCost,
        readyDate,
        createdAt: plan.createdAt,
        tests: {
          create: plan.tests.map((t) => ({
            labTestId: t.id,
            priceAtOrder: t.price,
            turnaroundDaysAtOrder: t.turnaroundDays,
          })),
        },
      },
    });
  }

  console.log(`Created ${orderPlans.length} orders.`);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
