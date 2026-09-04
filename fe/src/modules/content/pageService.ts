import { api } from '@/lib/api';
import type { Page, PageSummary, PageStatus } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface PageListParams {
  status?: PageStatus;
  q?: string;
  group?: string;
  tag?: string;
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
    const suffix = query.size ? `?${query}` : '';
    return api.get<PageSummary[]>(`${base(workspaceId)}${suffix}`);
  },

  get(workspaceId: string, id: string) {
    return api.get<Page>(`${base(workspaceId)}/${id}`);
  },

  /** URL of the standalone content document, for framing in the preview. */
  previewUrl(workspaceId: string, id: string) {
    return `${API_BASE}${base(workspaceId)}/${id}/preview`;
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
};
