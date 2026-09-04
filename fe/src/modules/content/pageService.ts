import { api } from '@/lib/api';
import type { Page, PageSummary, PageStatus } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/** API base as an absolute URL — for snippets a user copies into another app. */
export const absoluteApiBase = () =>
  /^https?:\/\//.test(API_BASE) ? API_BASE : `${window.location.origin}${API_BASE}`;

export interface PageListParams {
  status?: PageStatus;
  q?: string;
  group?: string;
  tag?: string;
  page?: number;
  perPage?: number;
}

export interface PageListResult {
  items: PageSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export type PagePayload = Partial<
  Pick<
    Page,
    | 'title'
    | 'slug'
    | 'description'
    | 'group'
    | 'tags'
    | 'heroImage'
    | 'thumbnailImage'
    | 'content'
    | 'seo'
    | 'status'
  >
>;

const base = (workspaceId: string) => `/workspaces/${workspaceId}/pages`;

export const pageService = {
  list(workspaceId: string, params: PageListParams = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.group) query.set('group', params.group);
    if (params.tag) query.set('tag', params.tag);
    if (params.page) query.set('page', String(params.page));
    if (params.perPage) query.set('perPage', String(params.perPage));
    const suffix = query.size ? `?${query}` : '';
    return api.get<PageListResult>(`${base(workspaceId)}${suffix}`);
  },

  get(workspaceId: string, id: string) {
    return api.get<Page>(`${base(workspaceId)}/${id}`);
  },

  /** Public content API for one published page. `format: 'html'` returns a
   *  standalone document (what the preview frames); otherwise JSON. */
  publicUrl(workspaceId: string, slug: string, opts: { format?: 'html'; fields?: string[] } = {}) {
    const query = new URLSearchParams();
    if (opts.format) query.set('format', opts.format);
    if (opts.fields?.length) query.set('fields', opts.fields.join(','));
    const suffix = query.size ? `?${query}` : '';
    return `${API_BASE}/workspaces/${workspaceId}/pagebyslug/${encodeURIComponent(slug)}${suffix}`;
  },

  /** URL of the standalone content document, for framing in the preview. */
  previewUrl(workspaceId: string, slug: string) {
    return this.publicUrl(workspaceId, slug, { format: 'html' });
  },

  create(workspaceId: string, payload: PagePayload) {
    return api.post<Page>(base(workspaceId), payload);
  },

  update(workspaceId: string, id: string, payload: PagePayload) {
    return api.patch<Page>(`${base(workspaceId)}/${id}`, payload);
  },

  destroy(workspaceId: string, id: string) {
    return api.delete<void>(`${base(workspaceId)}/${id}`);
  },

  /** Delete many pages in one request. */
  bulkDelete(workspaceId: string, ids: string[]) {
    return api.post<{ deleted: number }>(`${base(workspaceId)}/bulk`, { action: 'delete', ids });
  },

  /** Move many pages to a status in one request. */
  bulkStatus(workspaceId: string, ids: string[], status: PageStatus) {
    return api.post<{ updated: number }>(`${base(workspaceId)}/bulk`, {
      action: 'status',
      ids,
      status,
    });
  },
};
