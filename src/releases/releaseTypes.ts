export type ReleaseImpact = "patch" | "minor" | "major";

export type ReleaseAnnouncementMode = "silent" | "toast" | "modal" | "critical";

export type ReleaseChangeKind = "added" | "changed" | "fixed";

export interface AppReleaseDefinition {
  version: string;
  date: string;
  impact: ReleaseImpact;
  announcement?: ReleaseAnnouncementMode;
  contentKey?: string;
  legacy?: boolean;
  managed?: boolean;
  hero?: boolean;
  highlightCount?: number;
  highlightKeys?: string[];
  updateCount?: number;
  sections?: Partial<Record<ReleaseChangeKind, string[]>>;
}

export interface LocalizedReleaseHighlight {
  title: string;
  description: string;
  tag?: string;
}

export interface LocalizedAppRelease extends AppReleaseDefinition {
  headline: string;
  summary: string;
  heroContent?: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  highlights: LocalizedReleaseHighlight[];
  localizedSections: Record<ReleaseChangeKind, string[]>;
  changes: string[];
}

export interface ReleaseAnnouncementModel {
  mode: Exclude<ReleaseAnnouncementMode, "silent">;
  impact: ReleaseImpact;
  fromVersion: string;
  toVersion: string;
  releaseCount: number;
  releases: LocalizedAppRelease[];
  highlights: LocalizedReleaseHighlight[];
  changes: string[];
}
