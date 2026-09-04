import { useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { ApiError } from '@/lib/api';
import type { PageSeo, PageImage, PageStatus, PageSection } from '@/types';

export const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const EMPTY_IMAGE: PageImage = { url: '', alt: '' };
const EMPTY_SEO: PageSeo = { title: '', description: '', ogImage: '', noIndex: false };

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

  const [loading, setLoading] = useState(true);
  // Which button is in flight, so each shows its own spinner instead of both.
  const [savingAction, setSavingAction] = useState<'save' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setSeo(page.seo ?? EMPTY_SEO);
        setStatus(page.status);
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

  const save = async (nextStatus: PageStatus, action: 'save' | 'publish' = 'save') => {
    if (!workspace || !id) return;
    if (!title.trim()) {
      setError('A title is required');
      return;
    }

    setSavingAction(action);
    setError(null);
    try {
      const saved = await pageService.update(workspace.id, id, {
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
      setStatus(saved.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the page');
    } finally {
      setSavingAction(null);
    }
  };

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
    loading,
    savingAction,
    saving: savingAction !== null,
    error,
    save,
  };
}

export type PageEditorState = ReturnType<typeof usePageEditor>;
