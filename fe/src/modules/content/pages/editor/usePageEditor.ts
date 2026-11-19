import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { ApiError } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { Page, PageSeo, PageImage, PageStatus, PageSection } from '@/types';

export const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const EMPTY_IMAGE: PageImage = { url: '', alt: '' };
const EMPTY_SEO: PageSeo = {
  title: '',
  description: '',
  ogImage: '',
  noIndex: false,
  canonicalUrl: '',
  keywords: '',
  ogTitle: '',
  ogDescription: '',
  ogType: 'article',
  twitterCard: 'summary_large_image',
  noFollow: false,
};

/**
 * All state and load/save logic for the page editor, kept out of the
 * component tree so each piece of UI (toolbar, surface, settings modal) can
 * stay a plain function of props instead of also owning data fetching.
 */
export function usePageEditor(id: string | undefined) {
  const workspace = useWorkspace();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState<PageImage>(EMPTY_IMAGE);
  const [thumbnailImage, setThumbnailImage] = useState<PageImage>(EMPTY_IMAGE);
  const [content, setContent] = useState('');
  // Read-only: pages saved before sections moved into the content editor still
  // carry this, so the preview keeps showing it. Never written back.
  const [legacySections, setLegacySections] = useState<PageSection[]>([]);
  const [seo, setSeo] = useState<PageSeo>(EMPTY_SEO);
  const [status, setStatus] = useState<PageStatus>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  /**
   * The last values written to the server, so "has this changed?" is a
   * comparison rather than a flag every setter has to remember to raise.
   */
  const saved = useRef<string>('');
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        title,
        slug,
        description,
        group,
        tags,
        heroImage,
        thumbnailImage,
        content,
        seo,
      }),
    [title, slug, description, group, tags, heroImage, thumbnailImage, content, seo]
  );
  const dirty = !loading && snapshot !== saved.current;

  // Which button is in flight, so each shows its own spinner instead of both.
  const [savingAction, setSavingAction] = useState<'save' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The latest failure, readable straight after `await save()` — the `error`
  // state is only visible on the next render, too late for a toast.
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (!workspace || !id) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pageService.get(workspace.id, id);
        if (cancelled) return;
        setTitle(page.title);
        setSlug(page.slug);
        setDescription(page.description ?? '');
        setGroup(page.group ?? '');
        setTags(page.tags ?? []);
        setHeroImage(page.heroImage ?? EMPTY_IMAGE);
        setThumbnailImage(page.thumbnailImage ?? EMPTY_IMAGE);
        setContent(page.content ?? '');
        setLegacySections(page.sections ?? []);
        setSeo({ ...EMPTY_SEO, ...(page.seo ?? {}) });
        setStatus(page.status);
        setPublishedAt(page.publishedAt);
        // The loaded page is by definition unmodified, so it becomes the
        // baseline everything after is compared against.
        saved.current = JSON.stringify({
          title: page.title,
          slug: page.slug,
          description: page.description ?? '',
          group: page.group ?? '',
          tags: page.tags ?? [],
          heroImage: page.heroImage ?? EMPTY_IMAGE,
          thumbnailImage: page.thumbnailImage ?? EMPTY_IMAGE,
          content: page.content ?? '',
          seo: { ...EMPTY_SEO, ...(page.seo ?? {}) },
        });
        setSavedAt(page.updatedAt ? new Date(page.updatedAt) : null);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load the page');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspace, id]);

  /**
   * Writes every field and the given status. Resolves to the saved page, or to
   * null when nothing was written — the caller decides which toast to show, so
   * "Saved", "Published" and "Archived" can each read as what happened.
   */
  const save = useCallback(async (nextStatus: PageStatus, action: 'save' | 'publish' = 'save'): Promise<Page | null> => {
    if (!workspace || !id) return null;
    if (!title.trim()) {
      lastError.current = 'A title is required';
      setError(lastError.current);
      return null;
    }

    setSavingAction(action);
    setError(null);
    lastError.current = null;
    try {
      const page = await pageService.update(workspace.id, id, {
        title: title.trim(),
        slug: slug || slugify(title),
        description,
        group,
        tags,
        heroImage,
        thumbnailImage,
        content,
        seo,
        status: nextStatus,
      });
      setStatus(page.status);
      // Taken from the response rather than from local state, so a value the
      // server normalised — a slug derived from the title, say — is what the
      // next comparison is made against.
      saved.current = JSON.stringify({
        title: page.title,
        slug: page.slug,
        description: page.description ?? '',
        group: page.group ?? '',
        tags: page.tags ?? [],
        heroImage: page.heroImage ?? EMPTY_IMAGE,
        thumbnailImage: page.thumbnailImage ?? EMPTY_IMAGE,
        content: page.content ?? '',
        seo: page.seo ?? EMPTY_SEO,
      });
      setSlug(page.slug);
      setPublishedAt(page.publishedAt);
      setSavedAt(new Date());
      return page;
    } catch (err) {
      lastError.current = err instanceof ApiError ? err.message : 'Could not save the page';
      setError(lastError.current);
      return null;
    } finally {
      setSavingAction(null);
    }
  }, [workspace, id, title, slug, description, group, tags, heroImage, thumbnailImage, content, seo]);

  /*
   * The browser's own "leave site?" prompt. It is the only thing that can stop
   * a tab close or a reload — a router guard covers in-app navigation, but
   * cannot reach either of those.
   */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /* Cmd/Ctrl+S saves, keeping the page's current published state. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key === 's' && (e.metaKey || e.ctrlKey))) return;
      e.preventDefault();
      if (!dirty) return;
      void save(status === 'published' ? 'published' : 'draft').then((page) => {
        if (page) toast.success(page.status === 'published' ? 'Live page updated' : 'Draft saved');
        else toast.error('Could not save', { message: lastError.current ?? 'Please try again.' });
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, save, status]);

  return {
    workspace,
    title, setTitle,
    slug, setSlug,
    description, setDescription,
    group, setGroup,
    tags, setTags,
    heroImage, setHeroImage,
    thumbnailImage, setThumbnailImage,
    content, setContent,
    legacySections,
    seo, setSeo,
    status,
    publishedAt,
    loading,
    savingAction,
    saving: savingAction !== null,
    error,
    /** Message of the last failed save, readable right after it resolves. */
    lastError: () => lastError.current,
    save,
    dirty,
    savedAt,
  };
}

export type PageEditorState = ReturnType<typeof usePageEditor>;
