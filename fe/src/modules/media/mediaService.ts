import { api } from '@/lib/api';

export type MediaKind = 'image' | 'video' | 'raw';

export type UploadState = 'queued' | 'uploading' | 'done' | 'error';

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

 
  async upload(workspaceId: string, file: File, name?: string): Promise<MediaAsset> {
    const dataUrl = await readAsDataUrl(file);
    // The endpoint always answers in batch shape: { items, failed }.
    const res = await api.post<{ items: MediaAsset[]; failed: { message: string }[] }>(
      base(workspaceId),
      { file: dataUrl, name: name?.trim() || file.name, alt: '' }
    );
    const asset = res.items?.[0];
    if (!asset) throw new Error(res.failed?.[0]?.message ?? 'Upload failed');
    return asset;
  },
 
  async uploadMany(
    workspaceId: string,
    files: File[],
    onProgress?: (index: number, state: UploadState, asset?: MediaAsset, error?: string) => void
  ): Promise<{ assets: MediaAsset[]; failed: number }> {
    const assets: MediaAsset[] = [];
    let failed = 0;

    for (let i = 0; i < files.length; i += 1) {
      onProgress?.(i, 'uploading');
      try {
        const asset = await this.upload(workspaceId, files[i]);
        assets.push(asset);
        onProgress?.(i, 'done', asset);
      } catch (err) {
        failed += 1;
        onProgress?.(i, 'error', undefined, err instanceof Error ? err.message : 'Upload failed');
      }
    }

    return { assets, failed };
  },

  update(workspaceId: string, id: string, payload: { name?: string; alt?: string }) {
    return api.patch<MediaAsset>(`${base(workspaceId)}/${id}`, payload);
  },

  remove(workspaceId: string, id: string) {
    return api.delete<void>(`${base(workspaceId)}/${id}`);
  },

  /** Deletes many assets in one request. Returns the IDs actually removed. */
  bulkRemove(workspaceId: string, ids: string[]) {
    return api.post<{ deleted: string[] }>(`${base(workspaceId)}/bulk-delete`, { ids });
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
