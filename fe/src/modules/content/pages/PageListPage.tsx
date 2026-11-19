import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArchive, IconArrowBackUp, IconChevronLeft, IconChevronRight, IconCode, IconCopy, IconEye,
  IconPencil, IconPhoto, IconPlus, IconSearch, IconTrash, IconWorld, IconX,
} from '@tabler/icons-react';
import { absoluteApiBase } from '@/modules/content/pageService';
import { dashboardService } from '@/modules/dashboard/dashboardService';
import { CreatePageModal } from '@/modules/content/pages/CreatePageModal';
import { PageIntegrationModal } from '@/modules/content/pages/PageIntegrationModal';
import { relativeTime } from '@/lib/format';
import type { DashboardStats, PageStatus, PageSummary } from '@/types';
import { PER_PAGE, usePageLibrary, type StatusFilter } from './library/usePageLibrary';
import { Button, ConfirmDialog, Menu, StatusBadge, cx, inputCls, type ConfirmState } from '../ui';

const TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];

const GRID = 'md:grid-cols-[28px_minmax(0,1fr)_112px_160px_104px_36px]';

/**
 * The pages list. A row opens the page's detail screen, where it is reviewed
 * and published; editing is one click further, from there or from the row menu.
 */
export function PageListPage() {
  const library = usePageLibrary();
  const navigate = useNavigate();
  const { filters, pages, checked, workspace } = library;

  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [counts, setCounts] = useState<DashboardStats['pages'] | null>(null);

  // Tab counts come from the dashboard stats, which count every status at once;
  // re-read whenever the list reloads so they follow status changes.
  useEffect(() => {
    if (!workspace) return;
    dashboardService.stats(workspace.id).then((s) => setCounts(s.pages)).catch(() => {});
  }, [workspace, pages]);

  const countFor = (tab: StatusFilter) =>
    counts ? (tab === 'all' ? counts.total : counts[tab]) : undefined;

  const selectedPages = pages.filter((p) => checked.has(p.id));
  const undoMap = (list: PageSummary[]) => new Map(list.map((p) => [p.id, p.status] as [string, PageStatus]));
  const rangeStart = library.total === 0 ? 0 : (library.page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(library.page * PER_PAGE, library.total);

  const askDelete = (list: PageSummary[]) =>
    setConfirm({
      title: list.length === 1 ? 'Delete this page?' : `Delete ${list.length} pages?`,
      message:
        list.length === 1
          ? <>“{list[0].title || 'Untitled'}” will be deleted permanently. This cannot be undone. Archive it instead if you might need it later.</>
          : <>These pages will be deleted permanently. This cannot be undone. Archive them instead if you might need them later.</>,
      confirmLabel: 'Delete permanently',
      danger: true,
      onConfirm: async () => {
        await library.deletePages(list.map((p) => p.id));
      },
    });

  const askPublish = (p: PageSummary) =>
    setConfirm({
      title: 'Publish this page?',
      message: <>“{p.title || 'Untitled'}” will go live at <code className="rounded bg-surface-2 px-1 text-xs">/{p.slug}</code>.</>,
      confirmLabel: 'Publish',
      onConfirm: () => library.setStatusFor([p.id], 'published', undoMap([p])),
    });

  return (
    <div className="tw h-full overflow-y-auto font-sans text-fg">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {/* ---------------------------------------------------- header --- */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Pages</h1>
            <p className="mt-1 text-sm text-muted">
              {counts
                ? `${counts.published} published · ${counts.draft} drafts · ${counts.archived} archived`
                : 'Everything in this workspace, newest edit first.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button icon={<IconCode size={15} />} onClick={() => setIntegrationOpen(true)}>
              API
            </Button>
            <Button variant="primary" icon={<IconPlus size={15} />} onClick={() => library.setCreating(true)}>
              New page
            </Button>
          </div>
        </div>

        {/* --------------------------------------------------- filters --- */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <IconSearch size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
              placeholder="Search title or slug"
              className={cx(inputCls, 'pl-9')}
              aria-label="Search pages"
            />
          </div>

          <div className="flex rounded-sm border border-line-strong bg-surface p-0.5" role="tablist">
            {TABS.map((t) => {
              const active = filters.status === t.value;
              const n = countFor(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    filters.setStatus(t.value);
                    library.clearChecked();
                  }}
                  className={cx(
                    'rounded-[6px] px-3 py-1.5 text-[13px] font-medium',
                    active ? 'bg-cta text-cta-fg' : 'text-fg-2 hover:text-fg',
                  )}
                >
                  {t.label}
                  {n !== undefined && <span className={cx('ml-1.5 text-xs tabular-nums', active ? 'opacity-70' : 'text-faint')}>{n}</span>}
                </button>
              );
            })}
          </div>

          {filters.groups.length > 0 && (
            <select
              value={filters.group ?? ''}
              onChange={(e) => filters.setGroup(e.target.value || null)}
              className={cx(inputCls.replace('w-full ', ''), 'w-auto min-w-36')}
              aria-label="Filter by group"
            >
              <option value="">All groups</option>
              {filters.groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
        </div>

        {/* ------------------------------------------------- bulk bar --- */}
        {checked.size > 0 && (
          <div className="animate-fade-in mt-4 flex flex-wrap items-center gap-1 rounded-md bg-cta px-3 py-2 text-sm text-cta-fg">
            <span className="mr-2 font-medium">{checked.size} selected</span>
            <span className="flex-1" />
            {(['published', 'draft', 'archived'] as PageStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={library.busy}
                className="rounded-[6px] px-2.5 py-1 hover:bg-white/10 disabled:opacity-50"
                onClick={async () => {
                  await library.setStatusFor([...checked], s, undoMap(selectedPages));
                  library.clearChecked();
                }}
              >
                {s === 'published' ? 'Publish' : s === 'draft' ? 'Move to drafts' : 'Archive'}
              </button>
            ))}
            <button
              type="button"
              disabled={library.busy}
              className="rounded-[6px] px-2.5 py-1 hover:bg-white/10 disabled:opacity-50"
              onClick={() => askDelete(selectedPages)}
            >
              Delete
            </button>
            <button type="button" aria-label="Clear selection" className="rounded-[6px] p-1 hover:bg-white/10" onClick={library.clearChecked}>
              <IconX size={15} />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- table --- */}
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <div className={cx('hidden items-center gap-4 border-b border-line bg-surface-2/60 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase md:grid', GRID)}>
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              aria-label="Select all on this page"
              checked={library.allChecked}
              onChange={library.toggleAll}
            />
            <span>Page</span>
            <span>Status</span>
            <span>Tags</span>
            <span>Updated</span>
            <span />
          </div>

          {library.loading && pages.length === 0 && (
            <div className="divide-y divide-line">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-11 w-20 animate-pulse rounded bg-surface-2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {library.error && (
            <div className="px-6 py-10 text-center">
              <p className="font-medium text-danger">{library.error}</p>
              <Button className="mt-3" onClick={library.refresh}>Try again</Button>
            </div>
          )}

          {!library.loading && !library.error && pages.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-faint">
                <IconSearch size={20} />
              </div>
              <p className="mt-3 font-medium">{filters.filtered ? 'No pages match' : 'No pages yet'}</p>
              <p className="mt-1 text-sm text-muted">
                {filters.filtered ? 'Try another search or clear the filters.' : 'Create your first page to get started.'}
              </p>
              {filters.filtered ? (
                <Button
                  className="mt-4"
                  onClick={() => {
                    filters.setSearch('');
                    filters.setStatus('all');
                    filters.setGroup(null);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button className="mt-4" variant="primary" icon={<IconPlus size={15} />} onClick={() => library.setCreating(true)}>
                  New page
                </Button>
              )}
            </div>
          )}

          <div className={cx('divide-y divide-line', library.loading && pages.length > 0 && 'opacity-60')}>
            {pages.map((p) => {
              const thumb = p.thumbnailImage?.url || p.heroImage?.url;
              const isChecked = checked.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(library.detailsHref(p.id))}
                  className={cx(
                    'group grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_36px] items-center gap-4 px-4 py-3 hover:bg-surface-hover',
                    GRID,
                    isChecked && 'bg-accent-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    aria-label={`Select ${p.title || 'Untitled'}`}
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => library.toggleChecked(p.id)}
                  />
                  <div className="flex min-w-0 items-center gap-3">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-11 w-20 shrink-0 rounded border border-line object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-11 w-20 shrink-0 place-items-center rounded border border-dashed border-line-strong text-faint">
                        <IconPhoto size={16} stroke={1.6} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={cx('truncate text-sm font-medium group-hover:text-accent-text', !p.title && 'text-faint italic')}>
                        {p.title || 'Untitled page'}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {p.group ? `${p.group} · ` : ''}/{p.slug}
                      </p>
                      <div className="mt-1 md:hidden">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="hidden min-w-0 flex-wrap gap-1 md:flex">
                    {p.tags.slice(0, 2).map((t) => (
                      <span key={t} className="truncate rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg-2">{t}</span>
                    ))}
                    {p.tags.length > 2 && <span className="text-xs text-faint">+{p.tags.length - 2}</span>}
                  </div>
                  <span className="hidden text-sm text-muted md:block">{relativeTime(p.updatedAt)}</span>
                  <Menu
                    items={[
                      { label: 'Open', icon: <IconEye size={15} />, onClick: () => navigate(library.detailsHref(p.id)) },
                      { label: 'Edit', icon: <IconPencil size={15} />, onClick: () => navigate(library.editHref(p.id)) },
                      p.status !== 'published'
                        ? { label: 'Publish', icon: <IconWorld size={15} />, onClick: () => askPublish(p) }
                        : { label: 'Unpublish', icon: <IconWorld size={15} />, onClick: () => library.setStatusFor([p.id], 'draft', undoMap([p])) },
                      { label: 'Duplicate', icon: <IconCopy size={15} />, onClick: () => library.duplicate(p) },
                      p.status === 'archived'
                        ? { label: 'Restore to drafts', icon: <IconArrowBackUp size={15} />, onClick: () => library.setStatusFor([p.id], 'draft', undoMap([p])) }
                        : { label: 'Archive', icon: <IconArchive size={15} />, onClick: () => library.setStatusFor([p.id], 'archived', undoMap([p])) },
                      { label: 'Delete', icon: <IconTrash size={15} />, danger: true, onClick: () => askDelete([p]) },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ----------------------------------------------- pagination --- */}
        {library.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              {rangeStart}–{rangeEnd} of {library.total}
            </span>
            <div className="flex gap-2">
              <Button size="sm" icon={<IconChevronLeft size={15} />} disabled={library.page <= 1} onClick={() => library.setPage(library.page - 1)}>
                Previous
              </Button>
              <Button size="sm" disabled={library.page >= library.totalPages} onClick={() => library.setPage(library.page + 1)}>
                Next <IconChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreatePageModal
        opened={library.creating}
        onClose={() => library.setCreating(false)}
        onCreated={(created) => {
          library.setCreating(false);
          navigate(library.editHref(created.id));
        }}
      />

      {workspace && (
        <PageIntegrationModal
          opened={integrationOpen}
          onClose={() => setIntegrationOpen(false)}
          apiBase={absoluteApiBase()}
          workspaceId={workspace.id}
        />
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
