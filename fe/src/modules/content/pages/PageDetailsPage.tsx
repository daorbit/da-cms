import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconArchive, IconArrowBackUp, IconArrowLeft, IconCheck, IconCopy, IconExternalLink, IconEye,
  IconPencil, IconPhoto, IconTrash, IconWorld,
} from '@tabler/icons-react';
import { DaEditor } from 'da-text-editor';
import 'da-text-editor/styles.css';
import { usePageEditor } from '@/modules/content/pages/editor/usePageEditor';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { pageService } from '@/modules/content/pageService';
import { ApiError } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { PageStatus } from '@/types';
import { Button, Card, ChecklistView, ConfirmDialog, Menu, StatusBadge, type ConfirmState } from '../ui';
import { GooglePreview, SocialPreview, inSentence, pageChecks, sectionCount, wordCount } from '../pageBits';

const siteHost = (url: string | undefined, fallback: string) => {
  try {
    return url ? new URL(url).host : fallback;
  } catch {
    return fallback;
  }
};

/**
 * One page at a glance, and where it is published from.
 *
 * Read-only on purpose: the fields themselves are edited in the editor's side
 * panel, so this screen answers "is it ready, and is it live?" — status, a
 * pre-publish checklist, how it will look in search and social — and holds the
 * publish, unpublish, archive and delete actions.
 */
export function PageDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const page = usePageEditor(id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [copied, setCopied] = useState(false);

  const ws = page.workspace;
  const listHref = `/${ws?.slug}/content/pages`;
  const editHref = `/${ws?.slug}/content/pages/${id}/edit`;

  if (page.loading) {
    return (
      <div className="tw h-full space-y-4 overflow-y-auto p-3">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="aspect-[1200/630] animate-pulse rounded-lg bg-surface-2" />
          <div className="h-64 animate-pulse rounded-lg bg-surface-2" />
        </div>
      </div>
    );
  }

  const site = siteHost(ws?.websiteUrl, ws?.slug ?? '');
  const path = `${page.group ? page.group + '/' : ''}${page.slug}`;
  const apiUrl = ws ? pageService.publicUrl(ws.id, page.slug) : '';
  const checks = pageChecks(page);
  const words = wordCount(page.content);

  /** Writes the new status and reports it. `undo` is offered for reversible moves. */
  const moveTo = async (next: PageStatus, opts: { undo?: boolean } = {}) => {
    const before = page.status;
    const saved = await page.save(next, 'publish');
    if (!saved) {
      toast.error('Could not update the page', { message: page.lastError() ?? 'Please try again.' });
      return;
    }
    const undo = opts.undo
      ? { label: 'Undo', onClick: () => void page.save(before, 'publish').then((p) => p && toast.info('Change undone')) }
      : undefined;
    if (next === 'published') {
      toast.success('Page published', { message: `${site}/${path} is live.`, action: undo });
    } else if (next === 'archived') {
      toast.success('Page archived', { message: 'It is hidden from the content API.', action: undo });
    } else {
      toast.success(before === 'published' ? 'Page unpublished' : 'Moved to drafts', {
        message: 'Visitors can no longer see it.',
        action: undo,
      });
    }
  };

  const publish = () => {
    if (checks.missingRequired.length) {
      toast.error("Can't publish yet", {
        message: `Add: ${inSentence(checks.missingRequired)}.`,
        action: { label: 'Open editor', onClick: () => navigate(editHref) },
      });
      return;
    }
    const missing = checks.missingRecommended;
    setConfirm({
      title: missing.length ? 'Publish with missing details?' : 'Publish this page?',
      message: missing.length ? (
        <>
          This page has no {inSentence(missing)}. It will still go live at{' '}
          <span className="font-medium text-fg">{site}/{path}</span>, but it may look bare in listings and search results.
        </>
      ) : (
        <>
          “{page.title}” will go live at <span className="font-medium text-fg">{site}/{path}</span>.
        </>
      ),
      confirmLabel: missing.length ? 'Publish anyway' : 'Publish',
      onConfirm: () => moveTo('published', { undo: true }),
    });
  };

  const unpublish = () =>
    setConfirm({
      title: 'Unpublish this page?',
      message: 'Visitors and the content API will no longer see it. It moves back to drafts and you can publish it again any time.',
      confirmLabel: 'Unpublish',
      danger: true,
      onConfirm: () => moveTo('draft'),
    });

  const duplicate = async () => {
    if (!ws || !id) return;
    try {
      const copy = await pageService.duplicate(ws.id, id);
      toast.success('Page duplicated', {
        message: `"${copy.title}" is saved as a draft.`,
        action: { label: 'Edit copy', onClick: () => navigate(`/${ws.slug}/content/pages/${copy.id}/edit`) },
      });
    } catch (err) {
      toast.error('Could not duplicate the page', { message: err instanceof ApiError ? err.message : 'Please try again.' });
    }
  };

  const remove = () =>
    setConfirm({
      title: 'Delete this page?',
      message: <>“{page.title || 'Untitled'}” will be deleted permanently. This cannot be undone. Archive it instead if you might need it later.</>,
      confirmLabel: 'Delete permanently',
      danger: true,
      onConfirm: async () => {
        if (!ws || !id) return;
        try {
          await pageService.destroy(ws.id, id);
          toast.success('Page deleted');
          navigate(listHref);
        } catch (err) {
          toast.error('Could not delete the page', { message: err instanceof ApiError ? err.message : 'Please try again.' });
        }
      },
    });

  const copyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Link copied', { message: apiUrl });
    } catch {
      toast.error('Could not copy', { message: 'Your browser blocked clipboard access.' });
    }
  };

  const busy = page.savingAction !== null;

  return (
    <div className="tw h-full overflow-y-auto p-3 font-sans text-fg">
      <button type="button" onClick={() => navigate(listHref)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <IconArrowLeft size={15} /> All pages
      </button>

      {/* ------------------------------------------------------ header --- */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={page.status} />
            {page.savedAt && <span className="text-xs text-muted">Updated {relativeTime(page.savedAt)}</span>}
          </div>
          <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-tight">{page.title || 'Untitled page'}</h1>
          <p className="mt-1 text-sm text-muted">/{path}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<IconEye size={15} />} onClick={() => setPreviewOpen(true)}>Preview</Button>
          <Button icon={<IconPencil size={15} />} onClick={() => navigate(editHref)}>Edit</Button>
          {page.status === 'published' ? (
            <Button loading={busy} onClick={unpublish}>Unpublish</Button>
          ) : (
            <Button variant="primary" loading={busy} icon={<IconWorld size={15} />} onClick={publish}>Publish</Button>
          )}
          <Menu
            items={[
              { label: 'Duplicate', icon: <IconCopy size={15} />, onClick: duplicate },
              page.status === 'archived'
                ? { label: 'Restore to drafts', icon: <IconArrowBackUp size={15} />, onClick: () => moveTo('draft') }
                : { label: 'Archive', icon: <IconArchive size={15} />, onClick: () => moveTo('archived', { undo: true }) },
              { label: 'Delete', icon: <IconTrash size={15} />, danger: true, onClick: remove },
            ]}
          />
        </div>
      </div>

      {/* -------------------------------------------------------- body --- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {page.heroImage.url ? (
              <img src={page.heroImage.url} alt={page.heroImage.alt} className="aspect-[1200/630] w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => navigate(`${editHref}?tab=images`)}
                className="grid aspect-[1200/630] w-full place-items-center bg-surface-2 text-sm text-muted hover:text-accent-text"
              >
                <span className="flex flex-col items-center gap-2">
                  <IconPhoto size={22} stroke={1.6} /> Add a hero image
                </span>
              </button>
            )}
            {page.description && <p className="p-5 text-[15px] leading-7 text-fg-2">{page.description}</p>}
          </div>

          <Card title="Content" className="bg-panel" action={<Button size="sm" variant="ghost" icon={<IconPencil size={14} />} onClick={() => navigate(editHref)}>Edit</Button>}>
            {words > 0 ? (
              // One container only: the card. The editor's own frame is removed (see .da-plain).
              <div className="da-plain">
                <DaEditor key={page.savedAt?.toString()} defaultHtml={page.content} readOnly theme="light" minHeight="0px" />
              </div>
            ) : (
              <p className="text-sm text-muted">This page has no content yet.</p>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Publishing">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd><StatusBadge status={page.status} /></dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Published</dt>
                <dd>{page.publishedAt ? new Date(page.publishedAt).toLocaleString() : 'Not yet'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Group</dt>
                <dd>{page.group || '—'}</dd>
              </div>
            </dl>
            {page.status === 'published' && apiUrl && (
              <div className="mt-4 flex items-center gap-1 rounded-md bg-surface-2 py-1.5 pr-1.5 pl-3">
                <a href={apiUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-accent-text hover:underline" title="Content API URL">
                  {apiUrl}
                </a>
                <a href={apiUrl} target="_blank" rel="noreferrer" aria-label="Open content API response" className="rounded p-1.5 text-muted hover:bg-surface hover:text-fg">
                  <IconExternalLink size={14} />
                </a>
                <button type="button" onClick={copyApiUrl} aria-label="Copy content API URL" className="rounded p-1.5 text-muted hover:bg-surface hover:text-fg">
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </button>
              </div>
            )}
          </Card>

          <Card title="Ready to publish">
            <ChecklistView items={checks.all} />
            {(checks.missingRequired.length > 0 || checks.missingRecommended.length > 0) && (
              <Button size="sm" className="mt-4 w-full" onClick={() => navigate(editHref)}>
                Fix in editor
              </Button>
            )}
          </Card>

          <Card title="Content stats">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Words', words],
                ['Sections', sectionCount(page.content)],
                ['Read', `${Math.max(1, Math.round(words / 220))} min`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md bg-surface-2 p-2.5 text-center">
                  <p className="text-lg font-semibold tabular-nums">{v}</p>
                  <p className="text-xs text-muted">{k}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Google preview">
            <GooglePreview site={site} path={path} title={page.seo.title || page.title} description={page.seo.description || page.description} />
          </Card>

          <Card title="Social card">
            <SocialPreview
              site={site}
              title={page.seo.ogTitle || page.seo.title || page.title}
              image={page.seo.ogImage || page.thumbnailImage.url || page.heroImage.url}
            />
          </Card>

          <Card title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {page.tags.length ? (
                page.tags.map((t) => <span key={t} className="rounded bg-surface-2 px-2 py-1 text-xs text-fg-2">{t}</span>)
              ) : (
                <span className="text-sm text-faint">No tags</span>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {ws && id && (
        <ContentPreviewModal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={page.title}
          content={page.content}
          src={pageService.previewUrl(ws.id, page.slug)}
        />
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
