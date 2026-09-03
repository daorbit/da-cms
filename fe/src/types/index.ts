export interface User {
  id: string;
  email: string;
  name: string;
  jobRole: string;
  teamSize: string;
  /** Null until onboarding finishes; routing uses it to skip the flow. */
  onboardedAt: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
}

export type FieldType = 'text' | 'richtext' | 'number' | 'boolean' | 'date' | 'image';

export interface CollectionField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  fields: CollectionField[];
}

export type ContentStatus = 'draft' | 'published';

export interface Content {
  id: string;
  data: Record<string, unknown>;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
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
  heroImage: PageImage;
  thumbnailImage: PageImage;
  /** Rich text HTML produced by the TipTap editor. */
  body: string;
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
