import { prisma } from "@/lib/prisma";

export const FEATURES = [
  "KYC_REQUIRED",
  "WALLET_ENABLED",
  "WEBHOOKS_ENABLED",
  "MESSAGING_ENABLED",
  "PARTIAL_RELEASE",
  "FILE_UPLOADS",
] as const;

export type FeatureKey = typeof FEATURES[number];

export async function isFeatureEnabled(userId: string, key: FeatureKey): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { userId_key: { userId, key } },
  });
  return flag?.enabled ?? false;
}

export async function getUserFeatures(userId: string): Promise<Record<FeatureKey, boolean>> {
  const flags = await prisma.featureFlag.findMany({ where: { userId } });
  const result = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURES) {
    const flag = flags.find(f => f.key === key);
    result[key] = flag?.enabled ?? false;
  }
  return result;
}
