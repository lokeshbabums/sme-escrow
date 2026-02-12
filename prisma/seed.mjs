import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Password123!", 10);

  const client = await prisma.user.upsert({
    where: { email: "client@demo.com" },
    update: {},
    create: {
      email: "client@demo.com",
      name: "Demo Customer",
      role: "CLIENT",
      passwordHash: hash,
      profile: { create: { headline: "Regular Customer", company: "CleanWear Co." } },
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@demo.com" },
    update: {},
    create: {
      email: "vendor@demo.com",
      name: "Demo Vendor",
      role: "VENDOR",
      passwordHash: hash,
      profile: { create: { headline: "Professional Laundry Vendor", location: "Mumbai" } },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Demo Admin",
      role: "ADMIN",
      passwordHash: hash,
      profile: { create: { headline: "Escrow Operations" } },
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "demo-project-1" },
    update: {},
    create: {
      id: "demo-project-1",
      title: "Weekly laundry service - Premium wash",
      description: "Premium wash, fold, and delivery service. Funds held in escrow per service milestone.",
      status: "ACTIVE",
      clientId: client.id,
      vendorId: vendor.id,
      milestones: {
        create: [
          { title: "Pickup & Sorting", description: "Clothes picked up, sorted by fabric and color, stains noted", amountCents: 15000, status: "FUNDED", fundedAt: new Date() },
          { title: "Wash & Press", description: "Washed per care labels, pressed and folded", amountCents: 30000, status: "IN_PROGRESS" },
          { title: "QC & Delivery", description: "Quality checked, packaged, and delivered to customer", amountCents: 15000, status: "DRAFT" },
        ],
      },
    },
  });

  const funded = await prisma.milestone.findFirst({ where: { projectId: project.id, title: "Pickup & Sorting" }});
  if (funded) {
    await prisma.escrowLedgerEntry.createMany({
      data: [{ milestoneId: funded.id, type: "DEPOSIT", amountCents: funded.amountCents, note: "Customer deposited funds into escrow (demo)." }],
    });
  }

  // --- Wallets ---
  const clientWallet = await prisma.wallet.upsert({
    where: { userId: client.id },
    update: {},
    create: { userId: client.id, currency: "INR", availableCents: 100000, heldCents: 0 },
  });
  await prisma.wallet.upsert({
    where: { userId: vendor.id },
    update: {},
    create: { userId: vendor.id, currency: "INR", availableCents: 0, heldCents: 0 },
  });
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, currency: "INR", availableCents: 0, heldCents: 0 },
  });

  // --- Feature Flags ---
  const ALL_FEATURES = [
    "KYC_REQUIRED",
    "WALLET_ENABLED",
    "WEBHOOKS_ENABLED",
    "MESSAGING_ENABLED",
    "PARTIAL_RELEASE",
    "FILE_UPLOADS",
  ];

  for (const key of ALL_FEATURES) {
    await prisma.featureFlag.upsert({
      where: { userId_key: { userId: admin.id, key } },
      update: {},
      create: { userId: admin.id, key, enabled: true },
    });
  }

  const clientVendorFeatures = ["WALLET_ENABLED", "MESSAGING_ENABLED", "FILE_UPLOADS"];
  for (const uid of [client.id, vendor.id]) {
    for (const key of clientVendorFeatures) {
      await prisma.featureFlag.upsert({
        where: { userId_key: { userId: uid, key } },
        update: {},
        create: { userId: uid, key, enabled: true },
      });
    }
  }

  await prisma.featureFlag.upsert({
    where: { userId_key: { userId: client.id, key: "KYC_REQUIRED" } },
    update: {},
    create: { userId: client.id, key: "KYC_REQUIRED", enabled: true },
  });

  // --- KYC updates ---
  await prisma.profile.update({
    where: { userId: client.id },
    data: {
      kycStatus: "APPROVED",
      docType: "PAN",
      docNumber: "ABCDE1234F",
      docFileUrl: "/uploads/kyc/demo-pan.pdf",
      kycVerifiedAt: new Date(),
      kycVerifiedBy: admin.id,
      kycNotes: "Verified via demo seed",
    },
  });

  await prisma.profile.update({
    where: { userId: vendor.id },
    data: { kycStatus: "PENDING" },
  });

  // --- Demo Messages ---
  await prisma.message.createMany({
    data: [
      {
        projectId: project.id,
        senderId: client.id,
        body: "Hi, please handle my premium shirts with care. They need gentle wash.",
      },
      {
        projectId: project.id,
        senderId: vendor.id,
        body: "Sure! We'll use our delicate wash cycle. Pickup scheduled for tomorrow 10 AM.",
      },
    ],
  });

  // --- Demo Invoice for funded milestone deposit ---
  if (funded) {
    const invoiceCount = await prisma.invoice.count();
    const invoiceNum = invoiceCount + 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(invoiceNum).padStart(6, "0")}`;

    await prisma.invoice.upsert({
      where: { number: invoiceNumber },
      update: {},
      create: {
        number: invoiceNumber,
        type: "DEPOSIT",
        userId: client.id,
        subtotalCents: funded.amountCents,
        feeCents: 0,
        totalCents: funded.amountCents,
        projectId: project.id,
        milestoneId: funded.id,
        dataJson: JSON.stringify({
          description: "Escrow deposit for Pickup & Sorting milestone",
          lineItems: [{ label: "Escrow deposit – Pickup & Sorting", amountCents: funded.amountCents }],
          total: funded.amountCents,
          currency: "INR",
          issuedAt: new Date().toISOString(),
        }),
      },
    });

    // --- Wallet transaction matching escrow deposit ---
    await prisma.walletTransaction.create({
      data: {
        walletId: clientWallet.id,
        type: "HOLD",
        amountCents: funded.amountCents,
        status: "POSTED",
        projectId: project.id,
        milestoneId: funded.id,
        note: "Funds held in escrow for Pickup & Sorting milestone (demo)",
      },
    });
  }

  console.log("Seeded. Demo logins:");
  console.log("client@demo.com / Password123!");
  console.log("vendor@demo.com / Password123!");
  console.log("admin@demo.com / Password123!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
