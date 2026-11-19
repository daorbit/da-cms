import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconArrowLeft, IconEye, IconLayoutSidebarRight, IconWorld, IconX } from '@tabler/icons-react';
import { usePageEditor, slugify } from '@/modules/content/pages/editor/usePageEditor';
import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { pageService } from '@/modules/content/pageService';
import { workspaceService } from '@/modules/workspace/workspaceService';
import { relativeTime } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { Term } from '@/types';
import {
  Button, ChecklistView, ConfirmDialog, Counter, Dialog, Field, IconButton, Menu, StatusBadge, cx, inputCls,
  type ConfirmState,
} from '../ui';
import { GooglePreview, ImageSlot, SocialPreview, inSentence, pageChecks } from '../pageBits';

type Tab = 'details' | 'images' | 'seo' | 'checks';
const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'images', label: 'Images' },
  { id: 'seo', label: 'SEO' },
  { id: 'checks', label: 'Checks' },
];

const siteHost = (url: string | undefined, fallback: string) => {
  try {
    return url ? new URL(url).host : fallback;
  } catch {
    return fallback;
  }
};

/**
 * The writing screen: the editor takes the whole working area, and everything
 * about the page that is not its body — title, slug, taxonomy, images, SEO —
 * sits in a side panel beside it, so nothing interrupts the document itself.
 */
export function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editor = usePageEditor(id);

  const initialTab = (params.get('tab') as Tab) || 'details';
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? initialTab : 'details');
  const [panelOpen, setPanelOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  // Saving mid-generation would store a half-written document.
  const [generating, setGenerating] = useState(false);

  const [groups, setGroups] = useState<Term[]>([]);
  const [tagOptions, setTagOptions] = useState<Term[]>([]);
  useEffect(() => {
    if (!editor.workspace) return;
    workspaceService
      .settings(editor.workspace.id)
      .then((s) => {
        setGroups(s.configuration.groups);
        setTagOptions(s.configuration.tags);
      })
      .catch(() => {});
  }, [editor.workspace]);

  const ws = editor.workspace;
  const detailsHref = `/${ws?.slug}/content/pages/${id}/details`;
  const leave = (to: string) => (editor.dirty ? setPendingRoute(to) : navigate(to));

  if (editor.loading) {
    return (
      <div className="tw flex h-full flex-col">
        <div className="h-14 border-b border-line" />
        <div className="flex flex-1">
          <div className="flex-1 space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-surface-2" style={{ width: `${90 - i * 7}%` }} />
            ))}
          </div>
          <div className="hidden w-[360px] border-l border-line lg:block" />
        </div>
      </div>
    );
  }

  const site = siteHost(ws?.websiteUrl, ws?.slug ?? '');
  const path = `${editor.group ? editor.group + '/' : ''}${editor.slug || '…'}`;
  const checks = pageChecks(editor);
  const missingCount = checks.missingRequired.length + checks.missingRecommended.length;
  const published = editor.status === 'published';
  const busy = editor.savingAction !== null || generating;

  const save = async () => {
    const page = await editor.save(published ? 'published' : 'draft', 'save');
    if (page) toast.success(published ? 'Live page updated' : 'Draft saved');
    else toast.error('Could not save', { message: editor.lastError() ?? 'Please try again.' });
    return page;
  };

  const doPublish = async () => {
    const page = await editor.save('published', 'publish');
    if (!page) {
      toast.error('Could not publish', { message: editor.lastError() ?? 'Please try again.' });
      return;
    }
    toast.success('Page published', {
      message: `${site}/${path} is live.`,
      action: { label: 'View details', onClick: () => navigate(detailsHref) },
    });
  };

  const publish = () => {
    if (checks.missingRequired.length) {
      setTab(checks.missingRequired.some((c) => c.label === 'Title') ? 'details' : 'checks');
      setPanelOpen(true);
      toast.error("Can't publish yet", {
        message: `Add: ${inSentence(checks.missingRequired)}.`,
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
          “{editor.title}” will go live at <span className="font-medium text-fg">{site}/{path}</span>. Unsaved changes are saved first.
        </>
      ),
      confirmLabel: missing.length ? 'Publish anyway' : 'Publish',
      onConfirm: doPublish,
    });
  };

  const unpublish = () =>
    setConfirm({
      title: 'Unpublish this page?',
      message: 'Visitors and the content API will no longer see it. It moves back to drafts.',
      confirmLabel: 'Unpublish',
      danger: true,
      onConfirm: async () => {
        const page = await editor.save('draft', 'publish');
        if (page) toast.success('Page unpublished', { message: 'It is a draft again.' });
        else toast.error('Could not unpublish', { message: editor.lastError() ?? 'Please try again.' });
      },
    });

  return (
    <div className="tw flex h-full min-h-0 flex-col font-sans text-fg">
      {/* ---------------------------------------------------- top bar --- */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <IconButton label="Back to page details" onClick={() => leave(detailsHref)}>
          <IconArrowLeft size={17} />
        </IconButton>
        <p className="min-w-0 truncate text-sm font-semibold">{editor.title || 'Untitled page'}</p>
        <StatusBadge status={editor.status} />
        <SaveState saving={editor.savingAction !== null} generating={generating} dirty={editor.dirty} savedAt={editor.savedAt} />
        <span className="flex-1" />

        <Button variant="ghost" icon={<IconEye size={15} />} onClick={() => setPreviewOpen(true)}>
          <span className="hidden sm:inline">Preview</span>
        </Button>
        <IconButton
          label={panelOpen ? 'Hide side panel' : 'Show side panel'}
          aria-pressed={panelOpen}
          className={cx(panelOpen && 'bg-surface-hover text-fg')}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <IconLayoutSidebarRight size={17} />
        </IconButton>
        <Button
          loading={editor.savingAction === 'save'}
          disabled={!editor.dirty || busy}
          title={editor.dirty ? 'Save (Ctrl+S)' : 'No changes to save'}
          onClick={save}
        >
          {published ? 'Update' : 'Save draft'}
        </Button>
        {published ? (
          <Menu items={[{ label: 'Unpublish', icon: <IconWorld size={15} />, onClick: unpublish }]} />
        ) : (
          <Button variant="primary" icon={<IconWorld size={15} />} loading={editor.savingAction === 'publish'} disabled={busy} onClick={publish}>
            Publish
          </Button>
        )}
      </header>

      {/* ------------------------------------------------------- body --- */}
      <div className="relative flex min-h-0 flex-1">
        {/* The editor owns the whole working area: no outer padding or card. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <PageBodyEditor
            value={editor.content}
            onChange={editor.setContent}
            placeholder="Start writing, or type / for blocks…"
            onGeneratingChange={setGenerating}
            pageTitle={editor.title}
            pageDescription={editor.description}
          />
        </div>

        {panelOpen && (
          <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-l border-line bg-panel max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-pop-lg">
            <div className="flex shrink-0 items-center border-b border-line px-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cx(
                    'relative flex-1 px-2 py-3 text-[13px] font-medium',
                    tab === t.id ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  {t.label}
                  {t.id === 'checks' && missingCount > 0 && (
                    <span className="ml-1 rounded-full bg-warn/15 px-1.5 text-[11px] text-warn tabular-nums">{missingCount}</span>
                  )}
                  {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
                </button>
              ))}
              <IconButton label="Close side panel" className="lg:hidden" onClick={() => setPanelOpen(false)}>
                <IconX size={15} />
              </IconButton>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              {tab === 'details' && (
                <>
                  <Field label="Title">
                    <textarea
                      rows={2}
                      value={editor.title}
                      placeholder="Page title"
                      onChange={(e) => editor.setTitle(e.target.value)}
                      className={cx(inputCls, 'resize-none font-medium')}
                    />
                  </Field>
                  <Field label="Description" hint="Shown in listings and to content API consumers." counter={<Counter value={editor.description} min={140} max={200} />}>
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={editor.description}
                      placeholder="A short summary of the page"
                      onChange={(e) => editor.setDescription(e.target.value)}
                      className={cx(inputCls, 'resize-none')}
                    />
                  </Field>
                  <Field
                    label="URL slug"
                    hint={`${site}/${path}`}
                    counter={
                      editor.title && slugify(editor.title) !== editor.slug ? (
                        <button type="button" className="text-xs font-normal text-accent-text hover:underline" onClick={() => editor.setSlug(slugify(editor.title))}>
                          From title
                        </button>
                      ) : undefined
                    }
                  >
                    <input value={editor.slug} onChange={(e) => editor.setSlug(slugify(e.target.value) || e.target.value.toLowerCase())} className={inputCls} />
                  </Field>
                  <Field label="Group" hint={groups.length ? undefined : 'Add groups in workspace settings.'}>
                    <select value={editor.group} onChange={(e) => editor.setGroup(e.target.value)} className={inputCls} disabled={!groups.length}>
                      <option value="">No group</option>
                      {groups.map((g) => (
                        <option key={g.name} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </Field>
                  <TagPicker value={editor.tags} options={tagOptions.map((t) => t.name)} onChange={editor.setTags} />
                </>
              )}

              {tab === 'images' && (
                <>
                  <ImageSlot label="Hero image" hint="Wide banner at the top of the page. 1600×900 works best." value={editor.heroImage} onChange={editor.setHeroImage} />
                  <ImageSlot label="Thumbnail" hint="Used in listings and social cards. 1200×630." value={editor.thumbnailImage} onChange={editor.setThumbnailImage} />
                  {editor.heroImage.url && editor.thumbnailImage.url !== editor.heroImage.url && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        editor.setThumbnailImage({ ...editor.heroImage });
                        toast.info('Thumbnail set', { message: 'Using the hero image as the thumbnail.' });
                      }}
                    >
                      Use hero image as thumbnail
                    </Button>
                  )}
                </>
              )}

              {tab === 'seo' && (
                <>
                  <Field label="SEO title" counter={<Counter value={editor.seo.title} min={50} max={60} />}>
                    <input
                      value={editor.seo.title}
                      placeholder={editor.title || 'Defaults to the page title'}
                      onChange={(e) => editor.setSeo({ ...editor.seo, title: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Meta description" counter={<Counter value={editor.seo.description} min={140} max={160} />}>
                    <textarea
                      rows={4}
                      value={editor.seo.description}
                      placeholder={editor.description || 'What the reader gets, and a reason to click.'}
                      onChange={(e) => editor.setSeo({ ...editor.seo, description: e.target.value })}
                      className={cx(inputCls, 'resize-none')}
                    />
                  </Field>
                  <Field label="Keywords" hint="Comma separated, 5–8 phrases.">
                    <input value={editor.seo.keywords} onChange={(e) => editor.setSeo({ ...editor.seo, keywords: e.target.value })} className={inputCls} />
                  </Field>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-[var(--accent)]"
                      checked={editor.seo.noIndex}
                      onChange={(e) => editor.setSeo({ ...editor.seo, noIndex: e.target.checked })}
                    />
                    <span>
                      <span className="block text-[13px] font-medium">Hide from search engines</span>
                      <span className="block text-xs text-muted">Adds noindex, so this page is not listed in results.</span>
                    </span>
                  </label>
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium">Google preview</p>
                    <GooglePreview site={site} path={path} title={editor.seo.title || editor.title} description={editor.seo.description || editor.description} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium">Social card</p>
                    <SocialPreview
                      site={site}
                      title={editor.seo.ogTitle || editor.seo.title || editor.title}
                      image={editor.seo.ogImage || editor.thumbnailImage.url || editor.heroImage.url}
                    />
                  </div>
                </>
              )}

              {tab === 'checks' && (
                <>
                  <ChecklistView items={checks.all} />
                  <p className="text-xs leading-5 text-muted">
                    Title and body are needed to publish. The rest is recommended: you can still publish without them, and you will be asked first.
                  </p>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* -------------------------------------------- unsaved changes --- */}
      <Dialog
        open={pendingRoute !== null}
        onClose={() => setPendingRoute(null)}
        title="Leave without saving?"
        width="max-w-lg"
        footer={
          <>
            <Button onClick={() => setPendingRoute(null)} autoFocus>Keep editing</Button>
            <Button
              variant="ghost"
              className="text-danger"
              onClick={() => {
                const to = pendingRoute!;
                setPendingRoute(null);
                navigate(to);
              }}
            >
              Discard and leave
            </Button>
            <Button
              variant="primary"
              loading={editor.saving}
              onClick={async () => {
                const page = await save();
                if (!page) return;
                const to = pendingRoute!;
                setPendingRoute(null);
                navigate(to);
              }}
            >
              Save and leave
            </Button>
          </>
        }
      >
        This page has changes that have not been saved. If you leave now, they will be lost.
      </Dialog>

      {ws && id && (
        <ContentPreviewModal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={editor.title}
          content={editor.content}
          src={pageService.previewUrl(ws.id, editor.slug)}
        />
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/* --------------------------------------------------------------- parts --- */

function SaveState({ saving, generating, dirty, savedAt }: { saving: boolean; generating: boolean; dirty: boolean; savedAt: Date | null }) {
  // Re-render on a timer so "2 minutes ago" does not go stale.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const text = generating
    ? 'Orbit is writing…'
    : saving
      ? 'Saving…'
      : dirty
        ? 'Unsaved changes'
        : savedAt
          ? `Saved ${relativeTime(savedAt)}`
          : '';
  if (!text) return null;
  return (
    <span className={cx('hidden items-center gap-1.5 text-xs sm:inline-flex', dirty && !saving ? 'text-warn' : 'text-muted')}>
      {dirty && !saving && <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />}
      {text}
    </span>
  );
}

/** Tags chosen from the workspace's own list; free text is not allowed, so the API never sees an unknown tag. */
function TagPicker({ value, options, onChange }: { value: string[]; options: string[]; onChange: (tags: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const available = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(query.toLowerCase()));
  const add = (t: string) => {
    onChange([...value, t]);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <p className="mb-1.5 text-[13px] font-medium">Tags</p>
      <div
        className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-sm border border-line-strong bg-surface p-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft"
        onClick={() => setOpen(true)}
      >
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== t)); }}>
              <IconX size={11} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && available[0]) {
              e.preventDefault();
              add(available[0]);
            }
            if (e.key === 'Backspace' && !query && value.length) onChange(value.slice(0, -1));
          }}
          placeholder={value.length ? '' : options.length ? 'Add a tag' : 'No tags defined yet'}
          disabled={!options.length}
          className="min-w-20 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-faint"
        />
      </div>
      {open && available.length > 0 && (
        <div className="animate-pop-in absolute inset-x-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-pop">
          {available.map((t) => (
            <button key={t} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover" onClick={() => add(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
