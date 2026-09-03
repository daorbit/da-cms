export interface User {
  id: string;
  email: string;
  name: string;
  jobRole: string;
  teamSize: string;
  /** Null until onboarding finishes; routing uses it to skip the flow. */
  onboardedAt: string | null;
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  /** The signed-in user's role in this workspace. */
  role: WorkspaceRole | null;
}

/* ------------------------------------------------------------- members --- */

export interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: string | null;
  user: { id: string; name: string | null; email: string | null };
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  expiresAt: string;
  invitedAt: string | null;
  expired: boolean;
}

/* ------------------------------------------------------------ settings --- */

/** A page group or tag: `slug` is stored on pages, `name` is the label. */
export interface Term {
  name: string;
  slug: string;
}

export interface SiteLink {
  label: string;
  url: string;
  order: number;
}

export interface WorkspaceSettings {
  pageGroups: Term[];
  pageTags: Term[];
  siteLinks: SiteLink[];
}

/* ---------------------------------------------------------------- pages --- */

export type SectionType = 'hero' | 'richtext' | 'image' | 'cta' | 'features';

/**
 * `data` is deliberately loose: each section type owns its own shape, and the
 * editor narrows it per type rather than the model carrying a union of every
 * field any block might ever want.
 */
export interface PageSection {
  key: string;
  type: SectionType;
  data: Record<string, unknown>;
}

export interface PageSeo {
  title: string;
  description: string;
  ogImage: string;
  noIndex: boolean;
}

export interface PageImage {
  url: string;
  alt: string;
}

/** Null once the user has been deleted; `name` is null when unpopulated. */
export interface Author {
  id: string;
  name: string | null;
  email?: string | null;
}

export type PageStatus = 'draft' | 'published' | 'archived';

export interface Page {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** Group slug from workspace settings. */
  group: string;
  /** Tag slugs from workspace settings. */
  tags: string[];
  heroImage: PageImage;
  thumbnailImage: PageImage;
  /** HTML from the page editor. Hero/CTA/features render as blocks inline here. */
  body: string;
  /** Read-only: sections from pages saved before those blocks moved into `body`. */
  sections: PageSection[];
  seo: PageSeo;
  status: PageStatus;
  publishedAt: string | null;
  createdBy: Author | null;
  updatedBy: Author | null;
  createdAt?: string;
  updatedAt?: string;
}

/** The list endpoint omits the two heaviest fields. */
export type PageSummary = Omit<Page, 'body' | 'sections'>;

export interface DashboardStats {
  pages: { total: number; draft: number; published: number; archived: number };
  recent: PageSummary[];
}
