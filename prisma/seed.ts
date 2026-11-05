import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const FIRM_ID = process.env.DEMO_FIRM_ID?.trim() || "demo-firm";

/**
 * Development-only account. Change these values (or set the environment
 * variables) before using the seed against a shared database.
 */
const DEMO_USER = {
  id: "seed-user-demo",
  name: "Comptable Démo",
  email: process.env.DEMO_USER_EMAIL?.trim().toLowerCase() || "demo@ledgerflow.local",
  password: process.env.DEMO_USER_PASSWORD || "LedgerFlowDemo123",
};

type SeedClient = {
  id: string;
  reference: string;
  type: "INDIVIDUAL" | "COMPANY";
  status: "ACTIVE" | "ARCHIVED";
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  commercialRegister?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
};

const CLIENTS: SeedClient[] = [
  {
    id: "seed-client-atlas",
    reference: "CL-0001",
    type: "COMPANY",
    status: "ACTIVE",
    name: "Atlas Consulting SARL",
    contactName: "Amine Bensalem",
    email: "contact@atlas-consulting.example",
    phone: "+213 21 00 00 01",
    taxId: "000216001234567",
    commercialRegister: "16/00-1234567B12",
    addressLine1: "12 rue Didouche Mourad",
    city: "Alger",
    postalCode: "16000",
    notes: "Monthly bookkeeping. Invoices are sent on the 1st of each month.",
  },
  {
    id: "seed-client-nour",
    reference: "CL-0002",
    type: "COMPANY",
    status: "ACTIVE",
    name: "Nour Trading EURL",
    contactName: "Salima Kaci",
    email: "salima@nour-trading.example",
    phone: "+213 31 00 00 02",
    taxId: "000316002345678",
    commercialRegister: "31/00-2345678B13",
    addressLine1: "8 boulevard de la Soummam",
    city: "Oran",
    postalCode: "31000",
  },
  {
    id: "seed-client-amani",
    reference: "CL-0003",
    type: "INDIVIDUAL",
    status: "ACTIVE",
    name: "Amani Cherif",
    email: "amani.cherif@example.com",
    phone: "+213 55 00 00 03",
    taxId: "000416003456789",
    addressLine1: "Cité 200 logements, bâtiment C",
    city: "Constantine",
    postalCode: "25000",
    notes: "Freelance consultant. Prefers email contact.",
  },
  {
    id: "seed-client-cedrus",
    reference: "CL-0004",
    type: "COMPANY",
    status: "ACTIVE",
    name: "Cedrus Construction SPA",
    contactName: "Karim Haddad",
    email: "finance@cedrus-construction.example",
    phone: "+213 33 00 00 04",
    taxId: "000516004567890",
    commercialRegister: "33/00-3456789B14",
    addressLine1: "Zone industrielle, lot 14",
    city: "Sétif",
    postalCode: "19000",
  },
  {
    id: "seed-client-lys",
    reference: "CL-0005",
    type: "COMPANY",
    status: "ACTIVE",
    name: "Lys Médical SARL",
    contactName: "Dr. Nadia Toumi",
    email: "contact@lys-medical.example",
    phone: "+213 41 00 00 05",
    taxId: "000616005678901",
    addressLine1: "24 avenue de la République",
    city: "Annaba",
    postalCode: "23000",
    notes: "Quarterly VAT filings handled by the firm.",
  },
  {
    id: "seed-client-yasmine",
    reference: "CL-0006",
    type: "INDIVIDUAL",
    status: "ACTIVE",
    name: "Yasmine Belkacem",
    email: "yasmine.belkacem@example.com",
    phone: "+213 66 00 00 06",
    addressLine1: "7 rue des Oliviers",
    city: "Tlemcen",
    postalCode: "13000",
  },
  {
    id: "seed-client-sahara",
    reference: "CL-0007",
    type: "COMPANY",
    status: "ARCHIVED",
    name: "Sahara Logistics SARL",
    contactName: "Omar Zeroual",
    email: "ops@sahara-logistics.example",
    phone: "+213 49 00 00 07",
    taxId: "000716006789012",
    commercialRegister: "49/00-4567890B15",
    addressLine1: "Route nationale 3, km 4",
    city: "Ghardaïa",
    postalCode: "47000",
    notes: "Engagement ended. Kept for historical documents.",
  },
];

type SeedTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  status: "CLEARED" | "PENDING";
  category: "SALES" | "SERVICES" | "OPERATIONS" | "MARKETING" | "SOFTWARE" | "PAYROLL" | "OTHER";
  reference: string;
  description: string;
  amount: number;
  occurredAt: Date;
  clientId?: string;
};

type SeedInvoice = {
  id: string;
  number: string;
  clientId: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  issueDate: Date;
  dueDate: Date;
  total: number;
  notes?: string;
};

const EXPENSE_DESCRIPTIONS: Array<{
  category: SeedTransaction["category"];
  description: string;
  amount: number;
}> = [
  { category: "OPERATIONS", description: "Office rent", amount: 120_000 },
  { category: "PAYROLL", description: "Team payroll", amount: 380_000 },
  { category: "SOFTWARE", description: "Accounting software & hosting", amount: 46_000 },
  { category: "MARKETING", description: "Client acquisition campaign", amount: 92_000 },
  { category: "OPERATIONS", description: "Utilities and office supplies", amount: 38_000 },
  { category: "OTHER", description: "Bank fees and insurance", amount: 27_000 },
];

const INCOME_DESCRIPTIONS = [
  "Monthly bookkeeping retainer",
  "Annual financial statements",
  "VAT return preparation",
  "Payroll processing",
  "Advisory engagement",
];

/** Builds deterministic demo transactions so the dashboard has real history. */
function buildTransactions(): SeedTransaction[] {
  const now = new Date();
  const transactions: SeedTransaction[] = [];
  const clientIds = CLIENTS.filter((client) => client.status === "ACTIVE").map(
    (client) => client.id,
  );

  for (let offset = 23; offset >= 0; offset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const growth = 1 + (23 - offset) * 0.004;

    const isCurrentMonth = offset === 0;
    const today = now.getDate();

    INCOME_DESCRIPTIONS.forEach((description, index) => {
      const day = isCurrentMonth
        ? Math.max(1, Math.round(1 + (index * (today - 1)) / (INCOME_DESCRIPTIONS.length - 1)))
        : Math.min(4 + index * 5, 26);
      const amount = Math.round(
        (360_000 + ((offset * 53_000 + index * 71_000) % 430_000)) * growth,
      );
      transactions.push({
        id: `seed-tx-income-${year}-${month + 1}-${index + 1}`,
        type: "INCOME",
        status: "CLEARED",
        category: index % 3 === 0 ? "SALES" : "SERVICES",
        reference: `TX-${year}${String(month + 1).padStart(2, "0")}-${index + 1}`,
        description,
        amount,
        occurredAt: new Date(year, month, day),
        clientId: clientIds[(offset + index) % clientIds.length],
      });
    });

    EXPENSE_DESCRIPTIONS.forEach((expense, index) => {
      const day = isCurrentMonth
        ? Math.max(1, Math.round(1 + (index * (today - 1)) / (EXPENSE_DESCRIPTIONS.length - 1)))
        : Math.min(2 + index * 4, 27);
      const amount = Math.round(expense.amount * growth);
      transactions.push({
        id: `seed-tx-expense-${year}-${month + 1}-${index + 1}`,
        type: "EXPENSE",
        status: offset === 0 && index === 5 ? "PENDING" : "CLEARED",
        category: expense.category,
        reference: `TX-${year}${String(month + 1).padStart(2, "0")}-E${index + 1}`,
        description: expense.description,
        amount,
        occurredAt: new Date(year, month, day),
      });
    });
  }

  return transactions;
}

/** Builds invoices across the last 12 months with realistic statuses. */
function buildInvoices(): SeedInvoice[] {
  const now = new Date();
  const invoices: SeedInvoice[] = [];
  const companyIds = CLIENTS.filter((client) => client.type === "COMPANY").map(
    (client) => client.id,
  );
  let sequence = 0;

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const invoicesThisMonth = 2 + (offset % 3);

    for (let index = 0; index < invoicesThisMonth; index += 1) {
      sequence += 1;
      const issueDay =
        offset === 0 && invoicesThisMonth > 1
          ? Math.max(1, Math.round(1 + (index * (now.getDate() - 1)) / (invoicesThisMonth - 1)))
          : Math.min(5 + index * 7, 25);
      const issueDate = new Date(year, month, issueDay);
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const isPast = dueDate.getTime() < now.getTime();
      const status: SeedInvoice["status"] = isPast
        ? sequence % 5 === 0
          ? "OVERDUE"
          : "PAID"
        : issueDate.getTime() > now.getTime() - 5 * 86_400_000
          ? "DRAFT"
          : "SENT";

      const total = 95_000 + ((offset * 47_000 + index * 63_000) % 380_000);

      invoices.push({
        id: `seed-invoice-${year}-${month + 1}-${index + 1}`,
        number: `INV-${year}-${String(sequence).padStart(3, "0")}`,
        clientId: companyIds[(offset + index) % companyIds.length]!,
        status,
        issueDate,
        dueDate,
        total,
        notes: index === 0 ? "Monthly accounting services" : undefined,
      });
    }
  }

  return invoices;
}

async function main() {
  await prisma.firm.upsert({
    where: { id: FIRM_ID },
    update: { name: "Cabinet Demo" },
    create: {
      id: FIRM_ID,
      name: "Cabinet Demo",
      slug: "cabinet-demo",
    },
  });

  // A verified local account so the authenticated app can be exercised without
  // waiting for SMTP delivery. Better Auth stores the scrypt hash on the
  // credential account, not on the user row.
  const passwordHash = await hashPassword(DEMO_USER.password);
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name, emailVerified: true },
    create: {
      id: DEMO_USER.id,
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      emailVerified: true,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: { providerId: "credential", accountId: user.id },
    },
    update: { password: passwordHash },
    create: {
      id: `seed-account-${user.id}`,
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
  });

  // FIRM-01 — the demo user owns the demo workspace. This is what the real
  // `getFirmContext()` reads instead of the old hardcoded firm id.
  await prisma.firmMember.upsert({
    where: { firmId_userId: { firmId: FIRM_ID, userId: user.id } },
    update: { role: "OWNER" },
    create: { firmId: FIRM_ID, userId: user.id, role: "OWNER" },
  });

  for (const { id, ...client } of CLIENTS) {
    await prisma.client.upsert({
      where: { id },
      update: {
        ...client,
        archivedAt: client.status === "ARCHIVED" ? new Date() : null,
      },
      create: {
        id,
        ...client,
        firmId: FIRM_ID,
        archivedAt: client.status === "ARCHIVED" ? new Date() : null,
      },
    });
  }

  const transactions = buildTransactions();
  for (const { id, ...transaction } of transactions) {
    await prisma.transaction.upsert({
      where: { id },
      update: { ...transaction, firmId: FIRM_ID },
      create: { id, ...transaction, firmId: FIRM_ID, createdById: user.id },
    });
  }

  const invoices = buildInvoices();
  for (const { id, ...invoice } of invoices) {
    await prisma.invoice.upsert({
      where: { id },
      update: { ...invoice, firmId: FIRM_ID },
      create: { id, ...invoice, firmId: FIRM_ID, subtotal: invoice.total },
    });
  }

  console.info(`Seeded ${CLIENTS.length} clients for firm ${FIRM_ID}.`);
  console.info(`Seeded ${transactions.length} transactions and ${invoices.length} invoices.`);
  console.info(`Seeded demo user ${DEMO_USER.email} (verified, password from DEMO_USER_PASSWORD).`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
