import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { mediaService, type MediaAsset, type MediaKind } from './mediaService';
import type { UploadItem } from './UploadTray';

export type MediaFilter = 'all' | MediaKind;

/** Divides evenly into 2, 3 and 4 columns, so a full page never ends mid-row. */
export const MEDIA_PER_PAGE = 12;

const SEARCH_DELAY_MS = 300;
const TRAY_LINGER_MS = 2500;

/** One page of the workspace's library, newest first, plus uploading into it. */
export function useMediaLibrary(initialFilter: MediaFilter = 'all') {
  const workspaceId = useWorkspace()?.id;

  // Held together so changing the filter and returning to page 1 is one request.
  const [view, setView] = useState({ filter: initialFilter, query: '', page: 1 });
  const { filter, query, page } = view;
  const [revision, setRevision] = useState(0);

  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const setPage = useCallback((next: number) => setView((v) => ({ ...v, page: next })), []);
  const setFilter = (next: MediaFilter) => setView((v) => ({ ...v, filter: next, page: 1 }));
  const setQuery = (next: string) => setView((v) => ({ ...v, query: next, page: 1 }));
  const reload = () => setRevision((r) => r + 1);

  useEffect(() => {
    setPage(1);
  }, [workspaceId, setPage]);

  useEffect(() => {
    if (!workspaceId) return;
    let stale = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await mediaService.list(workspaceId, {
          kind: filter === 'all' ? undefined : filter,
          q: query,
          page,
          perPage: MEDIA_PER_PAGE,
        });
        if (stale) return;

        // Deleting can empty the last page; step back instead of showing nothing.
        const lastPage = Math.max(1, Math.ceil(res.total / MEDIA_PER_PAGE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setItems(res.items);
        setTotal(res.total);
        setLoading(false);
      } catch (err) {
        if (stale) return;
        setError(err instanceof ApiError ? err.message : 'Could not load the library');
        setLoading(false);
      }
    };

    const timer = setTimeout(load, query ? SEARCH_DELAY_MS : 0);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [workspaceId, filter, query, page, revision, setPage]);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length || !workspaceId) return { assets: [], failed: 0 };

    const files = Array.from(fileList);
    setUploads(files.map((file) => ({ file, state: 'queued' })));

    const result = await mediaService.uploadMany(workspaceId, files, (index, state, _asset, err) => {
      setUploads((prev) => prev.map((u, i) => (i === index ? { ...u, state, error: err } : u)));
    });

    if (result.assets.length > 0) {
      // Back to where the new files sort, dropping a search or filter that hides them.
      setView((v) => ({
        filter: result.assets.every((a) => a.kind === v.filter) ? v.filter : 'all',
        query: '',
        page: 1,
      }));
      reload();
    }

    setTimeout(() => setUploads([]), TRAY_LINGER_MS);
    return result;
  };

  return {
    workspaceId,
    items,
    setItems,
    total,
    loading,
    error,
    filter,
    setFilter,
    query,
    setQuery,
    page,
    setPage,
    reload,
    uploads,
    uploading: uploads.some((u) => u.state === 'queued' || u.state === 'uploading'),
    upload,
  };
}
