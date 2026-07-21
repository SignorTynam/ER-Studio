import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "../../i18n/useI18n";
import { APP_VERSION } from "../../utils/appMeta";
import { RELEASE_CATALOG } from "../../releases/releaseCatalog";
import { localizeReleaseCatalog } from "../../releases/releaseLocalization";
import { buildReleaseAnnouncement, getUnseenReleases } from "../../releases/releaseSelectors";
import type { ReleaseAnnouncementModel } from "../../releases/releaseTypes";
import { readLastSeenRelease, writeLastSeenRelease } from "./releaseStorage";

interface ReleaseSessionState {
  initialized: boolean;
  lastSeen: string | null;
  firstRun: boolean;
  announcementDismissed: boolean;
}

function createInitialState(): ReleaseSessionState {
  const result = readLastSeenRelease();
  return {
    initialized: true,
    lastSeen: result.lastSeen,
    firstRun: result.firstRun,
    announcementDismissed: false,
  };
}

export function useAppReleases() {
  const { t } = useI18n();
  const [session, setSession] = useState<ReleaseSessionState>(createInitialState);
  const [releaseCenterOpen, setReleaseCenterOpen] = useState(false);
  const [releaseCenterUnreadVersions, setReleaseCenterUnreadVersions] = useState<string[]>([]);
  const allReleases = useMemo(() => localizeReleaseCatalog(RELEASE_CATALOG, t), [t]);
  const unseenReleases = useMemo(
    () => session.firstRun ? [] : getUnseenReleases(allReleases, session.lastSeen, APP_VERSION),
    [allReleases, session.firstRun, session.lastSeen],
  );
  const announcement = useMemo<ReleaseAnnouncementModel | null>(() => {
    if (session.firstRun || session.announcementDismissed || !session.lastSeen) return null;
    return buildReleaseAnnouncement(unseenReleases, session.lastSeen, APP_VERSION);
  }, [session, unseenReleases]);

  const acknowledgeCurrentRelease = useCallback(() => {
    writeLastSeenRelease(APP_VERSION);
    setSession((current) => ({
      ...current,
      lastSeen: APP_VERSION,
      firstRun: false,
      announcementDismissed: true,
    }));
  }, []);

  const dismissAnnouncement = useCallback(() => acknowledgeCurrentRelease(), [acknowledgeCurrentRelease]);

  const openReleaseCenter = useCallback(() => {
    setReleaseCenterUnreadVersions(unseenReleases.map((release) => release.version));
    setReleaseCenterOpen(true);
    acknowledgeCurrentRelease();
  }, [acknowledgeCurrentRelease, unseenReleases]);

  const closeReleaseCenter = useCallback(() => setReleaseCenterOpen(false), []);

  useEffect(() => {
    if (!session.initialized || !session.firstRun) return;
    writeLastSeenRelease(APP_VERSION);
    setSession((current) => ({ ...current, lastSeen: APP_VERSION, firstRun: false, announcementDismissed: true }));
  }, [session.firstRun, session.initialized]);

  return {
    currentVersion: APP_VERSION,
    allReleases,
    unseenReleases,
    unreadCount: unseenReleases.length,
    announcement,
    releaseCenterOpen,
    releaseCenterUnreadVersions,
    openReleaseCenter,
    closeReleaseCenter,
    acknowledgeCurrentRelease,
    dismissAnnouncement,
  };
}
