import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/toast';
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
 * Everything the pages list does, apart from how it looks: the filtered, paged
 * list, multi-select with bulk actions, and the per-page actions. Every action
 * reports its outcome as a toast.
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

  const refresh = useCallback(async () => {
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

  /**
   * Moves pages to a status. `undo` is what each page was before, so the toast
   * can put them back with one click — pages can be in different states, so
   * undo restores each to its own previous status rather than to one value.
   */
  const setStatusFor = async (ids: string[], next: PageStatus, undo?: Map<string, PageStatus>) => {
    if (!workspace || ids.length === 0) return;
    setBusy(true);
    try {
      const { updated } = await pageService.bulkStatus(workspace.id, ids, next);
      const verb = next === 'published' ? 'published' : next === 'archived' ? 'archived' : 'moved to drafts';
      const title = updated === 1 && ids.length === 1
        ? `Page ${verb}`
        : `${plural(updated, 'page')} ${verb}`;
      const action = undo && undo.size
        ? {
            label: 'Undo',
            onClick: async () => {
              const byStatus = new Map<PageStatus, string[]>();
              undo.forEach((s, id) => byStatus.set(s, [...(byStatus.get(s) ?? []), id]));
              try {
                for (const [s, list] of byStatus) await pageService.bulkStatus(workspace.id, list, s);
                toast.info('Change undone');
                await refresh();
              } catch (err) {
                toast.error('Could not undo', { message: failure(err, 'Try changing the status again.') });
              }
            },
          }
        : undefined;
      toast.success(title, { action });
      await refresh();
    } catch (err) {
      toast.error(`Could not change the status to ${STATUS_LABEL[next].toLowerCase()}`, {
        message: failure(err, 'Please try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const deletePages = async (ids: string[]) => {
    if (!workspace || ids.length === 0) return false;
    setBusy(true);
    try {
      const { deleted } = await pageService.bulkDelete(workspace.id, ids);
      toast.success(deleted === 1 ? 'Page deleted' : `${plural(deleted, 'page')} deleted`);
      setChecked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      await refresh();
      return true;
    } catch (err) {
      toast.error('Could not delete', { message: failure(err, 'Please try again.') });
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
      toast.success('Page duplicated', {
        message: `"${copy.title}" is saved as a draft.`,
        action: { label: 'Edit copy', onClick: () => navigate(`/${workspace.slug}/content/pages/${copy.id}/edit`) },
      });
      await refresh();
    } catch (err) {
      toast.error('Could not duplicate the page', { message: failure(err, 'Please try again.') });
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
    refresh,

    filters: { status, setStatus, group, setGroup, groups, search, setSearch, filtered: Boolean(query || group || status !== 'all') },

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
