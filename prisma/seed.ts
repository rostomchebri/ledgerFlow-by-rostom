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

  console.info(`Seeded ${CLIENTS.length} clients for firm ${FIRM_ID}.`);
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
