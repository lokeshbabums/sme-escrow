import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    failures.push(testName);
    console.log(`  FAIL: ${testName}`);
  }
}

async function resetDB() {
  await prisma.webhookEvent.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.escrowLedgerEntry.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("=== LaundryEscrow Full Regression Test Suite ===\n");

  console.log("[SETUP] Resetting database...");
  await resetDB();

  const hash = await bcrypt.hash("Password123!", 10);

  const customer = await prisma.user.create({
    data: { email: "customer@test.com", name: "Test Customer", role: "CLIENT", passwordHash: hash, profile: { create: { headline: "Customer" } } },
  });
  const provider = await prisma.user.create({
    data: { email: "provider@test.com", name: "Test Provider", role: "FREELANCER", passwordHash: hash, profile: { create: { headline: "Provider" } } },
  });
  const admin = await prisma.user.create({
    data: { email: "admin@test.com", name: "Test Admin", role: "ADMIN", passwordHash: hash, profile: { create: { headline: "Admin" } } },
  });
  const customer2 = await prisma.user.create({
    data: { email: "customer2@test.com", name: "Other Customer", role: "CLIENT", passwordHash: hash, profile: { create: { headline: "Customer2" } } },
  });

  console.log("  Users created.\n");

  // ──────────────────────────────────────────────
  // 1. CORE FLOWS (unchanged)
  // ──────────────────────────────────────────────
  console.log("[1] Core Escrow Flow");

  const project = await prisma.project.create({
    data: { title: "Premium Wash", description: "Full laundry service with pickup and delivery", clientId: customer.id, status: "DRAFT" },
  });
  assert(project.status === "DRAFT", "Project created as DRAFT");

  await prisma.project.update({ where: { id: project.id }, data: { freelancerId: provider.id, status: "ACTIVE" } });
  assert((await prisma.project.findUnique({ where: { id: project.id } }))?.status === "ACTIVE", "Project ACTIVE after assignment");

  const m1 = await prisma.milestone.create({
    data: { projectId: project.id, title: "Pickup", description: "Pickup clothes", amountCents: 15000, status: "DRAFT" },
  });
  const m2 = await prisma.milestone.create({
    data: { projectId: project.id, title: "Wash", description: "Wash and press", amountCents: 30000, status: "DRAFT" },
  });
  assert(m1.status === "DRAFT" && m1.releasedCents === 0, "Milestone created with DRAFT and 0 releasedCents");

  // Fund
  await prisma.$transaction([
    prisma.milestone.update({ where: { id: m1.id }, data: { status: "FUNDED", fundedAt: new Date() } }),
    prisma.escrowLedgerEntry.create({ data: { milestoneId: m1.id, type: "DEPOSIT", amountCents: m1.amountCents } }),
  ]);
  assert((await prisma.milestone.findUnique({ where: { id: m1.id } }))?.status === "FUNDED", "Milestone funded");

  // Submit
  await prisma.$transaction([
    prisma.milestone.update({ where: { id: m1.id }, data: { status: "SUBMITTED", submittedAt: new Date() } }),
    prisma.escrowLedgerEntry.create({ data: { milestoneId: m1.id, type: "PROOF_SUBMITTED", amountCents: 0 } }),
  ]);
  assert((await prisma.milestone.findUnique({ where: { id: m1.id } }))?.status === "SUBMITTED", "Milestone submitted");

  // Release
  await prisma.$transaction([
    prisma.milestone.update({ where: { id: m1.id }, data: { status: "RELEASED", releasedAt: new Date(), releasedCents: m1.amountCents } }),
    prisma.escrowLedgerEntry.create({ data: { milestoneId: m1.id, type: "RELEASE", amountCents: m1.amountCents } }),
  ]);
  const m1Final = await prisma.milestone.findUnique({ where: { id: m1.id } });
  assert(m1Final?.status === "RELEASED", "Milestone released");
  assert(m1Final?.releasedCents === 15000, "releasedCents updated to full amount");

  // Dispute
  await prisma.milestone.update({ where: { id: m2.id }, data: { status: "FUNDED", fundedAt: new Date() } });
  await prisma.$transaction([
    prisma.milestone.update({ where: { id: m2.id }, data: { status: "DISPUTED" } }),
    prisma.dispute.create({ data: { projectId: project.id, milestoneId: m2.id, reason: "Damage claim", status: "OPEN" } }),
  ]);
  assert((await prisma.milestone.findUnique({ where: { id: m2.id } }))?.status === "DISPUTED", "Milestone disputed");

  console.log();

  // ──────────────────────────────────────────────
  // 2. WALLET
  // ──────────────────────────────────────────────
  console.log("[2] Wallet System");

  const cWallet = await prisma.wallet.create({
    data: { userId: customer.id, currency: "INR", availableCents: 0, heldCents: 0 },
  });
  assert(cWallet.availableCents === 0, "Wallet starts with 0 balance");

  // Deposit
  await prisma.$transaction([
    prisma.wallet.update({ where: { id: cWallet.id }, data: { availableCents: { increment: 100000 } } }),
    prisma.walletTransaction.create({ data: { walletId: cWallet.id, type: "DEPOSIT", amountCents: 100000, note: "Initial deposit" } }),
  ]);
  const cWalletAfter = await prisma.wallet.findUnique({ where: { id: cWallet.id } });
  assert(cWalletAfter?.availableCents === 100000, "Wallet deposit increases available");

  // Hold (for funding)
  await prisma.$transaction([
    prisma.wallet.update({ where: { id: cWallet.id }, data: { availableCents: { decrement: 15000 }, heldCents: { increment: 15000 } } }),
    prisma.walletTransaction.create({ data: { walletId: cWallet.id, type: "HOLD", amountCents: 15000, note: "Escrow hold" } }),
  ]);
  const cWalletHold = await prisma.wallet.findUnique({ where: { id: cWallet.id } });
  assert(cWalletHold?.availableCents === 85000, "Hold deducts from available");
  assert(cWalletHold?.heldCents === 15000, "Hold adds to held");

  // Release to provider
  const pWallet = await prisma.wallet.create({
    data: { userId: provider.id, currency: "INR", availableCents: 0, heldCents: 0 },
  });
  await prisma.$transaction([
    prisma.wallet.update({ where: { id: cWallet.id }, data: { heldCents: { decrement: 15000 } } }),
    prisma.wallet.update({ where: { id: pWallet.id }, data: { availableCents: { increment: 15000 } } }),
    prisma.walletTransaction.create({ data: { walletId: cWallet.id, type: "RELEASE", amountCents: 15000, note: "Released to provider" } }),
    prisma.walletTransaction.create({ data: { walletId: pWallet.id, type: "RELEASE", amountCents: 15000, note: "Payment received" } }),
  ]);
  const cWalletRel = await prisma.wallet.findUnique({ where: { id: cWallet.id } });
  const pWalletRel = await prisma.wallet.findUnique({ where: { id: pWallet.id } });
  assert(cWalletRel?.heldCents === 0, "Client held zeroed after release");
  assert(pWalletRel?.availableCents === 15000, "Provider received funds");

  const txCount = await prisma.walletTransaction.count({ where: { walletId: cWallet.id } });
  assert(txCount === 3, "Customer has 3 wallet transactions (deposit, hold, release)");

  console.log();

  // ──────────────────────────────────────────────
  // 3. PARTIAL RELEASE
  // ──────────────────────────────────────────────
  console.log("[3] Partial Release");

  const m3 = await prisma.milestone.create({
    data: { projectId: project.id, title: "QC", description: "Quality check", amountCents: 20000, status: "SUBMITTED", submittedAt: new Date() },
  });

  // Partial release of 8000 out of 20000
  await prisma.$transaction([
    prisma.milestone.update({ where: { id: m3.id }, data: { releasedCents: { increment: 8000 } } }),
    prisma.escrowLedgerEntry.create({ data: { milestoneId: m3.id, type: "PARTIAL_RELEASE", amountCents: 8000, note: "Partial release 1" } }),
  ]);
  let m3After = await prisma.milestone.findUnique({ where: { id: m3.id } });
  assert(m3After?.releasedCents === 8000, "Partial release: 8000 of 20000 released");
  assert(m3After?.status === "SUBMITTED", "Status stays SUBMITTED after partial");

  // Second partial release of 12000 (remaining)
  await prisma.$transaction([
    prisma.milestone.update({ where: { id: m3.id }, data: { releasedCents: { increment: 12000 }, status: "RELEASED", releasedAt: new Date() } }),
    prisma.escrowLedgerEntry.create({ data: { milestoneId: m3.id, type: "PARTIAL_RELEASE", amountCents: 12000, note: "Final release" } }),
  ]);
  m3After = await prisma.milestone.findUnique({ where: { id: m3.id } });
  assert(m3After?.releasedCents === 20000, "Full amount released after 2 partials");
  assert(m3After?.status === "RELEASED", "Status RELEASED when fully released");

  console.log();

  // ──────────────────────────────────────────────
  // 4. KYC
  // ──────────────────────────────────────────────
  console.log("[4] KYC System");

  // Submit KYC
  await prisma.profile.update({
    where: { userId: customer.id },
    data: { docType: "Aadhaar", docNumber: "1234-5678-9012", kycStatus: "PENDING" },
  });
  let prof = await prisma.profile.findUnique({ where: { userId: customer.id } });
  assert(prof?.kycStatus === "PENDING", "KYC status set to PENDING on submission");
  assert(prof?.docType === "Aadhaar", "KYC doc type saved");
  assert(prof?.docNumber === "1234-5678-9012", "KYC doc number saved");

  // Admin approves
  await prisma.profile.update({
    where: { userId: customer.id },
    data: { kycStatus: "APPROVED", kycVerifiedAt: new Date(), kycVerifiedBy: admin.id, kycNotes: "Docs verified" },
  });
  prof = await prisma.profile.findUnique({ where: { userId: customer.id } });
  assert(prof?.kycStatus === "APPROVED", "KYC approved by admin");
  assert(prof?.kycVerifiedBy === admin.id, "KYC verifier recorded");

  // Admin rejects another
  await prisma.profile.update({
    where: { userId: provider.id },
    data: { docType: "PAN", docNumber: "ABCDE1234F", kycStatus: "PENDING" },
  });
  await prisma.profile.update({
    where: { userId: provider.id },
    data: { kycStatus: "REJECTED", kycVerifiedAt: new Date(), kycVerifiedBy: admin.id, kycNotes: "Blurry document" },
  });
  prof = await prisma.profile.findUnique({ where: { userId: provider.id } });
  assert(prof?.kycStatus === "REJECTED", "KYC can be rejected");
  assert(prof?.kycNotes === "Blurry document", "Rejection notes saved");

  console.log();

  // ──────────────────────────────────────────────
  // 5. INVOICES
  // ──────────────────────────────────────────────
  console.log("[5] Invoices");

  const inv1 = await prisma.invoice.create({
    data: {
      number: "INV-2026-000001",
      type: "DEPOSIT",
      status: "ISSUED",
      subtotalCents: 15000,
      feeCents: 0,
      totalCents: 15000,
      userId: customer.id,
      projectId: project.id,
      milestoneId: m1.id,
      dataJson: JSON.stringify({ description: "Escrow deposit for Pickup", lineItems: [{ label: "Pickup", amountCents: 15000 }] }),
    },
  });
  assert(inv1.number === "INV-2026-000001", "Invoice number generated");
  assert(inv1.type === "DEPOSIT", "Invoice type correct");
  assert(inv1.totalCents === 15000, "Invoice total correct");

  const inv2 = await prisma.invoice.create({
    data: {
      number: "INV-2026-000002",
      type: "RELEASE",
      status: "ISSUED",
      subtotalCents: 15000,
      feeCents: 150,
      totalCents: 15150,
      userId: provider.id,
      projectId: project.id,
      milestoneId: m1.id,
      dataJson: JSON.stringify({ description: "Payment release for Pickup", lineItems: [{ label: "Pickup payment", amountCents: 15000 }, { label: "Fee", amountCents: 150 }] }),
    },
  });
  assert(inv2.feeCents === 150, "Invoice fee recorded");
  assert(inv2.totalCents === 15150, "Invoice total includes fee");

  const inv3 = await prisma.invoice.create({
    data: {
      number: "INV-2026-000003",
      type: "PARTIAL_RELEASE",
      status: "ISSUED",
      subtotalCents: 8000,
      feeCents: 0,
      totalCents: 8000,
      userId: provider.id,
      projectId: project.id,
      milestoneId: m3.id,
      dataJson: JSON.stringify({ description: "Partial release for QC" }),
    },
  });
  assert(inv3.type === "PARTIAL_RELEASE", "Partial release invoice created");

  // Unique number constraint
  let dupError = false;
  try {
    await prisma.invoice.create({ data: { number: "INV-2026-000001", type: "DEPOSIT", subtotalCents: 0, totalCents: 0, userId: customer.id, dataJson: "{}" } });
  } catch { dupError = true; }
  assert(dupError, "Unique invoice number enforced");

  const custInvoices = await prisma.invoice.count({ where: { userId: customer.id } });
  assert(custInvoices === 1, "Customer has 1 invoice");
  const provInvoices = await prisma.invoice.count({ where: { userId: provider.id } });
  assert(provInvoices === 2, "Provider has 2 invoices");

  console.log();

  // ──────────────────────────────────────────────
  // 6. MESSAGING
  // ──────────────────────────────────────────────
  console.log("[6] Messaging");

  const msg1 = await prisma.message.create({
    data: { projectId: project.id, senderId: customer.id, body: "Please handle my shirts carefully." },
  });
  assert(msg1.body === "Please handle my shirts carefully.", "Message created");
  assert(msg1.senderId === customer.id, "Sender recorded");

  const msg2 = await prisma.message.create({
    data: { projectId: project.id, senderId: provider.id, body: "Understood! Pickup at 10 AM tomorrow." },
  });

  const msgs = await prisma.message.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });
  assert(msgs.length === 2, "2 messages in project");
  assert(msgs[0].senderId === customer.id, "First message from customer");
  assert(msgs[1].senderId === provider.id, "Second message from provider");

  // Customer2 should not see messages of another project
  const c2Project = await prisma.project.create({
    data: { title: "Other order", description: "Test", clientId: customer2.id, status: "DRAFT" },
  });
  const c2Msgs = await prisma.message.findMany({ where: { projectId: c2Project.id } });
  assert(c2Msgs.length === 0, "Other customer sees no messages");

  console.log();

  // ──────────────────────────────────────────────
  // 7. FILE ATTACHMENTS
  // ──────────────────────────────────────────────
  console.log("[7] File Attachments");

  // Attach to message
  const file1 = await prisma.fileAttachment.create({
    data: { uploaderId: customer.id, fileName: "receipt.pdf", mimeType: "application/pdf", sizeBytes: 24500, messageId: msg1.id },
  });
  assert(file1.fileName === "receipt.pdf", "File attachment created");
  assert(file1.messageId === msg1.id, "File linked to message");

  // Attach to milestone
  const file2 = await prisma.fileAttachment.create({
    data: { uploaderId: provider.id, fileName: "pickup-photo.jpg", mimeType: "image/jpeg", sizeBytes: 150000, milestoneId: m1.id },
  });
  assert(file2.milestoneId === m1.id, "File linked to milestone");

  // Attach to dispute
  const dispute = await prisma.dispute.findFirst({ where: { projectId: project.id } });
  const file3 = await prisma.fileAttachment.create({
    data: { uploaderId: customer.id, fileName: "damage-evidence.png", mimeType: "image/png", sizeBytes: 200000, disputeId: dispute.id },
  });
  assert(file3.disputeId === dispute.id, "File linked to dispute");

  const userFiles = await prisma.fileAttachment.count({ where: { uploaderId: customer.id } });
  assert(userFiles === 2, "Customer has 2 file uploads");

  console.log();

  // ──────────────────────────────────────────────
  // 8. WEBHOOKS
  // ──────────────────────────────────────────────
  console.log("[8] Webhooks");

  const wh1 = await prisma.webhookEndpoint.create({
    data: { userId: customer.id, url: "https://example.com/webhook", secret: "whsec_test123", enabled: true, eventTypes: "milestone.funded,milestone.released" },
  });
  assert(wh1.enabled === true, "Webhook created and enabled");
  assert(wh1.eventTypes?.includes("milestone.funded"), "Webhook event filter saved");

  // Create webhook event
  const whEvent = await prisma.webhookEvent.create({
    data: {
      endpointId: wh1.id,
      eventType: "milestone.funded",
      payloadJson: JSON.stringify({ milestoneId: m1.id, amountCents: 15000 }),
      status: "DELIVERED",
      attempts: 1,
      deliveredAt: new Date(),
      responseStatus: 200,
    },
  });
  assert(whEvent.status === "DELIVERED", "Webhook event recorded as delivered");
  assert(whEvent.responseStatus === 200, "Webhook response status captured");

  // Disable webhook
  await prisma.webhookEndpoint.update({ where: { id: wh1.id }, data: { enabled: false } });
  const whDisabled = await prisma.webhookEndpoint.findUnique({ where: { id: wh1.id } });
  assert(whDisabled?.enabled === false, "Webhook can be disabled");

  console.log();

  // ──────────────────────────────────────────────
  // 9. FEATURE FLAGS
  // ──────────────────────────────────────────────
  console.log("[9] Feature Flags");

  // Enable wallet for customer
  const ff1 = await prisma.featureFlag.create({
    data: { userId: customer.id, key: "WALLET_ENABLED", enabled: true, createdById: admin.id },
  });
  assert(ff1.enabled === true, "Feature flag created and enabled");
  assert(ff1.key === "WALLET_ENABLED", "Feature key correct");

  // Enable multiple features
  await prisma.featureFlag.createMany({
    data: [
      { userId: customer.id, key: "MESSAGING_ENABLED", enabled: true },
      { userId: customer.id, key: "FILE_UPLOADS", enabled: true },
      { userId: customer.id, key: "PARTIAL_RELEASE", enabled: false },
      { userId: provider.id, key: "WALLET_ENABLED", enabled: true },
      { userId: provider.id, key: "MESSAGING_ENABLED", enabled: true },
    ],
  });
  const custFlags = await prisma.featureFlag.findMany({ where: { userId: customer.id } });
  assert(custFlags.length === 4, "Customer has 4 feature flags");

  const partialFlag = custFlags.find(f => f.key === "PARTIAL_RELEASE");
  assert(partialFlag?.enabled === false, "PARTIAL_RELEASE disabled for customer");

  // Toggle feature
  await prisma.featureFlag.update({
    where: { userId_key: { userId: customer.id, key: "PARTIAL_RELEASE" } },
    data: { enabled: true },
  });
  const toggled = await prisma.featureFlag.findUnique({
    where: { userId_key: { userId: customer.id, key: "PARTIAL_RELEASE" } },
  });
  assert(toggled?.enabled === true, "Feature flag toggled on");

  // Unique constraint
  let dupFlagError = false;
  try {
    await prisma.featureFlag.create({ data: { userId: customer.id, key: "WALLET_ENABLED", enabled: true } });
  } catch { dupFlagError = true; }
  assert(dupFlagError, "Unique [userId, key] constraint enforced");

  // Admin can see all flags
  const allFlags = await prisma.featureFlag.findMany({});
  assert(allFlags.length >= 6, "All feature flags queryable");

  console.log();

  // ──────────────────────────────────────────────
  // 10. ROLE ISOLATION (with new features)
  // ──────────────────────────────────────────────
  console.log("[10] Role Isolation with New Features");

  // Customer sees only their wallet
  const custWallets = await prisma.wallet.findMany({ where: { userId: customer.id } });
  assert(custWallets.length === 1, "Customer has exactly 1 wallet");

  // Provider sees only their wallet
  const provWallets = await prisma.wallet.findMany({ where: { userId: provider.id } });
  assert(provWallets.length === 1, "Provider has exactly 1 wallet");

  // Customer sees only their invoices
  const custInv = await prisma.invoice.findMany({ where: { userId: customer.id } });
  assert(custInv.length === 1, "Customer sees own invoices");

  // Feature flags scoped to user
  const provFlags = await prisma.featureFlag.findMany({ where: { userId: provider.id } });
  assert(provFlags.length === 2, "Provider has 2 flags (separate from customer)");

  // Messages scoped to project
  const projMsgs = await prisma.message.findMany({ where: { projectId: project.id } });
  assert(projMsgs.length === 2, "Messages scoped to project");

  console.log();

  // ──────────────────────────────────────────────
  // 11. DATA MODEL INTEGRITY
  // ──────────────────────────────────────────────
  console.log("[11] Data Model Integrity");

  // User -> wallet relation
  const userWithWallet = await prisma.user.findUnique({ where: { id: customer.id }, include: { wallet: true } });
  assert(userWithWallet?.wallet !== null, "User.wallet relation works");

  // User -> featureFlags relation
  const userWithFlags = await prisma.user.findUnique({ where: { id: customer.id }, include: { featureFlags: true } });
  assert(userWithFlags?.featureFlags.length === 4, "User.featureFlags relation works");

  // User -> invoices relation
  const userWithInv = await prisma.user.findUnique({ where: { id: customer.id }, include: { invoices: true } });
  assert(userWithInv?.invoices.length === 1, "User.invoices relation works");

  // User -> sentMessages relation
  const userWithMsgs = await prisma.user.findUnique({ where: { id: customer.id }, include: { sentMessages: true } });
  assert(userWithMsgs?.sentMessages.length === 1, "User.sentMessages relation works");

  // User -> fileAttachments relation
  const userWithFiles = await prisma.user.findUnique({ where: { id: customer.id }, include: { fileAttachments: true } });
  assert(userWithFiles?.fileAttachments.length === 2, "User.fileAttachments relation works");

  // User -> webhookEndpoints relation
  const userWithWh = await prisma.user.findUnique({ where: { id: customer.id }, include: { webhookEndpoints: true } });
  assert(userWithWh?.webhookEndpoints.length === 1, "User.webhookEndpoints relation works");

  // Project -> messages relation
  const projWithMsgs = await prisma.project.findUnique({ where: { id: project.id }, include: { messages: true } });
  assert(projWithMsgs?.messages.length === 2, "Project.messages relation works");

  // Milestone -> attachments relation
  const msWithAttach = await prisma.milestone.findUnique({ where: { id: m1.id }, include: { attachments: true } });
  assert(msWithAttach?.attachments.length === 1, "Milestone.attachments relation works");

  // Dispute -> attachments relation
  const dispWithAttach = await prisma.dispute.findUnique({ where: { id: dispute.id }, include: { attachments: true } });
  assert(dispWithAttach?.attachments.length === 1, "Dispute.attachments relation works");

  // Message -> attachments relation
  const msgWithAttach = await prisma.message.findUnique({ where: { id: msg1.id }, include: { attachments: true } });
  assert(msgWithAttach?.attachments.length === 1, "Message.attachments relation works");

  // Wallet -> transactions relation
  const walletWithTx = await prisma.wallet.findUnique({ where: { id: cWallet.id }, include: { transactions: true } });
  assert(walletWithTx?.transactions.length === 3, "Wallet.transactions relation works");

  // WebhookEndpoint -> events relation
  const whWithEvents = await prisma.webhookEndpoint.findUnique({ where: { id: wh1.id }, include: { events: true } });
  assert(whWithEvents?.events.length === 1, "WebhookEndpoint.events relation works");

  console.log();

  // ──────────────────────────────────────────────
  // 12. EDGE CASES
  // ──────────────────────────────────────────────
  console.log("[12] Edge Cases");

  // Zero-amount partial release
  const zeroRelease = await prisma.escrowLedgerEntry.create({
    data: { milestoneId: m3.id, type: "PARTIAL_RELEASE", amountCents: 0, note: "Zero amount test" },
  });
  assert(zeroRelease.amountCents === 0, "Zero-amount ledger entry allowed");

  // Wallet with 0 balance
  const emptyWallet = await prisma.wallet.create({
    data: { userId: customer2.id, currency: "INR" },
  });
  assert(emptyWallet.availableCents === 0, "Empty wallet created with 0");
  assert(emptyWallet.heldCents === 0, "Empty wallet held is 0");

  // Long message
  const longMsg = await prisma.message.create({
    data: { projectId: project.id, senderId: customer.id, body: "A".repeat(4000) },
  });
  assert(longMsg.body.length === 4000, "Long message (4000 chars) saved");

  // Invoice with large amounts
  const bigInv = await prisma.invoice.create({
    data: { number: "INV-2026-999999", type: "DEPOSIT", subtotalCents: 99999999, totalCents: 99999999, userId: customer.id, dataJson: "{}" },
  });
  assert(bigInv.totalCents === 99999999, "Large invoice amount handled");

  // Multiple webhooks per user (different URLs)
  const wh2 = await prisma.webhookEndpoint.create({
    data: { userId: customer.id, url: "https://other.example.com/hook", enabled: true },
  });
  const whCount = await prisma.webhookEndpoint.count({ where: { userId: customer.id } });
  assert(whCount === 2, "Multiple webhooks per user allowed");

  console.log();

  // ──────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────
  console.log("=".repeat(50));
  console.log(`TOTAL: ${passed + failed} tests | PASSED: ${passed} | FAILED: ${failed}`);
  if (failures.length > 0) {
    console.log("\nFailed tests:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log("=".repeat(50));

  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
