import { prisma } from "@/lib/prisma";

export async function fireWebhookEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      userId,
      enabled: true,
    },
  });

  for (const ep of endpoints) {
    const eventTypes = ep.eventTypes ? ep.eventTypes.split(",").map((t) => t.trim()) : [];
    if (eventTypes.length > 0 && !eventTypes.includes(eventType) && !eventTypes.includes("*")) {
      continue;
    }

    const event = await prisma.webhookEvent.create({
      data: {
        endpointId: ep.id,
        eventType,
        payloadJson: JSON.stringify(payload),
        status: "PENDING",
      },
    });

    // Fire and forget — attempt delivery
    deliverWebhook(event.id, ep.url, ep.secret, eventType, payload).catch(() => {});
  }
}

async function deliverWebhook(
  eventId: string,
  url: string,
  secret: string | null,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (secret) {
    const crypto = require("crypto");
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Webhook-Signature"] = signature;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: res.ok ? "DELIVERED" : "FAILED",
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        ...(res.ok ? { deliveredAt: new Date() } : {}),
        responseStatus: res.status,
      },
    });
  } catch {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }
}
