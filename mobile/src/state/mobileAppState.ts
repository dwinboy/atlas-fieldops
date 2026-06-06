import type {
  MobileAssignment,
  MobileBootstrapPackage,
  MobileEntity,
  MobileForm,
  MobileNotification,
  MobileSubmission,
  MobileSyncQueueItem,
} from "@/models/contracts";
import type { NetworkSnapshot } from "@/sync/networkStatus";

export type MobileAppState = {
  bootstrap: MobileBootstrapPackage | null;
  network: NetworkSnapshot;
  assignments: MobileAssignment[];
  entities: MobileEntity[];
  forms: MobileForm[];
  drafts: MobileSubmission[];
  syncQueue: MobileSyncQueueItem[];
  notifications: MobileNotification[];
};

export const emptyMobileAppState: MobileAppState = {
  bootstrap: null,
  network: {
    isOnline: true,
    lastOnlineAt: null,
    connectionType: "unknown",
  },
  assignments: [],
  entities: [],
  forms: [],
  drafts: [],
  syncQueue: [],
  notifications: [],
};
