import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { plural } from '@/lib/format';
import { STATUS_LABEL } from '@/components/StatusLabel';
import { pageService } from '@/modules/content/pageService';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { PageStatus, PageSummary } from '@/types';

export type StatusFilter = 'all' | PageStatus;

export const PER_PAGE = 20;

const failure = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/**
 * Everything the pages workspace does, apart from how it looks: the filtered,
 * paged list, the page selected for preview (kept in `?page=` so it can be
 * linked to), multi-select with bulk actions, and the per-page actions.
 */
export function usePageLibrary() {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [pages, setPages] = useState<PageSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [group, setGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  const selectedId = params.get('page');
  const creating = params.get('new') === '1';

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const select = useCallback((id: string | null) => setParam('page', id), [setParam]);
  const setCreating = useCallback((open: boolean) => setParam('new', open ? '1' : null), [setParam]);

  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!workspace) return;
    workspaceService
      .settings(workspace.id)
      .then((s) => setGroups(s.configuration.groups.map((g) => g.name)))
      .catch(() => {});
  }, [workspace]);

  useEffect(() => {
    setPage(1);
  }, [status, group, query]);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const result = await pageService.list(workspace.id, {
        ...(status !== 'all' ? { status } : {}),
        ...(group ? { group } : {}),
        ...(query ? { q: query } : {}),
        page,
        perPage: PER_PAGE,
      });
      setPages(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      if (result.page > result.totalPages) setPage(result.totalPages);
    } catch (err) {
      setError(failure(err, 'Could not load pages'));
    } finally {
      setLoading(false);
    }
  }, [workspace, status, group, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  /** Reloads the list and tells the preview its page may have changed. */
  const refresh = useCallback(async () => {
    setRevision((r) => r + 1);
    await load();
  }, [load]);

  const toggleChecked = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.has(id));

  const toggleAll = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (allChecked) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const clearChecked = () => setChecked(new Set());

  const setStatusFor = async (ids: string[], next: PageStatus) => {
    if (!workspace || ids.length === 0) return;
    setBusy(true);
    try {
      const { updated } = await pageService.bulkStatus(workspace.id, ids, next);
      notifications.show({ message: `${plural(updated, 'page')} moved to ${STATUS_LABEL[next]}` });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: failure(err, 'Could not change the status') });
    } finally {
      setBusy(false);
    }
  };

  const deletePages = async (ids: string[]) => {
    if (!workspace || ids.length === 0) return false;
    setBusy(true);
    try {
      const { deleted } = await pageService.bulkDelete(workspace.id, ids);
      notifications.show({ message: `${plural(deleted, 'page')} deleted` });
      if (selectedId && ids.includes(selectedId)) select(null);
      setChecked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      await refresh();
      return true;
    } catch (err) {
      notifications.show({ color: 'red', message: failure(err, 'Could not delete') });
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Copies a page and opens the copy, which exists to be edited. */
  const duplicate = async (p: PageSummary) => {
    if (!workspace) return;
    setBusy(true);
    try {
      const copy = await pageService.duplicate(workspace.id, p.id);
      notifications.show({ message: `Duplicated "${p.title}"` });
      navigate(`/${workspace.slug}/content/pages/${copy.id}/edit`);
    } catch (err) {
      notifications.show({ color: 'red', message: failure(err, 'Could not duplicate the page') });
    } finally {
      setBusy(false);
    }
  };

  const editHref = (id: string) => `/${workspace?.slug}/content/pages/${id}/edit`;
  const detailsHref = (id: string) => `/${workspace?.slug}/content/pages/${id}/details`;

  return {
    workspace,
    pages,
    total,
    page,
    totalPages,
    setPage,
    loading,
    error,
    revision,
    refresh,

    filters: { status, setStatus, group, setGroup, groups, search, setSearch, filtered: Boolean(query || group || status !== 'all') },

    selectedId,
    select,
    creating,
    setCreating,

    checked,
    toggleChecked,
    allChecked,
    toggleAll,
    clearChecked,

    busy,
    setStatusFor,
    deletePages,
    duplicate,
    editHref,
    detailsHref,
  };
}

export type PageLibrary = ReturnType<typeof usePageLibrary>;
