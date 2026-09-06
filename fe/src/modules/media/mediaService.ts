import { api } from '@/lib/api';

export type MediaKind = 'image' | 'video' | 'raw';

export interface MediaAsset {
  id: string;
  name: string;
  alt: string;
  url: string;
  kind: MediaKind;
  mime: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  /** A delivery-time transformation of the asset, not a second upload. */
  thumbnailUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaListResult {
  items: MediaAsset[];
  total: number;
  page: number;
  perPage: number;
}

const base = (workspaceId: string) => `/workspaces/${workspaceId}/media`;

export const mediaService = {
  list(
    workspaceId: string,
    params: { kind?: MediaKind; q?: string; page?: number; perPage?: number } = {}
  ) {
    const query = new URLSearchParams();
    if (params.kind) query.set('kind', params.kind);
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.page) query.set('page', String(params.page));
    if (params.perPage) query.set('perPage', String(params.perPage));

    const suffix = query.size ? `?${query}` : '';
    return api.get<MediaListResult>(`${base(workspaceId)}${suffix}`);
  },

  /**
   * Uploads one file, read into a base64 data URL first.
   *
   * A data URL rather than multipart because the API takes JSON throughout, and
   * the backend hands the same string to Cloudinary without buffering a file.
   */
  async upload(workspaceId: string, file: File, name?: string) {
    const dataUrl = await readAsDataUrl(file);
    return api.post<MediaAsset>(base(workspaceId), {
      file: dataUrl,
      name: name?.trim() || file.name,
      alt: '',
    });
  },

  update(workspaceId: string, id: string, payload: { name?: string; alt?: string }) {
    return api.patch<MediaAsset>(`${base(workspaceId)}/${id}`, payload);
  },

  remove(workspaceId: string, id: string) {
    return api.delete<void>(`${base(workspaceId)}/${id}`);
  },
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Bytes as something readable in a listing. */
export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
