import { createMobileApis } from "@/api/mobileApis";
import type { MobileDeviceRegistration } from "@/models/contracts";
import { mobileAppConfig } from "@/config/appConfig";
import { nowIso } from "@/utils/ids";

export class DeviceRegistrationService {
  constructor(private readonly apis = createMobileApis()) {}

  registrationPayload(input: {
    deviceId: string;
    deviceName?: string | null;
    osVersion?: string | null;
  }): MobileDeviceRegistration {
    return {
      deviceId: input.deviceId,
      deviceName: input.deviceName ?? null,
      platform: "Android",
      appVersion: mobileAppConfig.appVersion,
      osVersion: input.osVersion ?? null,
      lastSeenAt: nowIso(),
    };
  }

  async register(token: string, input: { deviceId: string; deviceName?: string | null; osVersion?: string | null }) {
    return this.apis.auth.registerDevice(token, this.registrationPayload(input));
  }
}
