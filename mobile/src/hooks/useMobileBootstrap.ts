import { createMobileApis } from "@/api/mobileApis";
import type { MobileSyncPackage } from "@/models/contracts";

export async function loadMobileBootstrap(token: string): Promise<MobileSyncPackage> {
  return createMobileApis().sync.syncPackage(token);
}
