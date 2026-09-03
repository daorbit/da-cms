import { useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { createSection } from '@/modules/content/sections/registry';
import { ApiError } from '@/lib/api';
import type {
  PageSection, PageSeo, PageImage, PageStatus, PageEditorType, SectionType,
} from '@/types';

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
  const [heroImage, setHeroImage] = useState<PageImage>(EMPTY_IMAGE);
  const [thumbnailImage, setThumbnailImage] = useState<PageImage>(EMPTY_IMAGE);
  const [editorType, setEditorType] = useState<PageEditorType>('rich');
  const [body, setBody] = useState('');
  const [bodyBlocks, setBodyBlocks] = useState<unknown[]>([]);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [seo, setSeo] = useState<PageSeo>(EMPTY_SEO);
  const [status, setStatus] = useState<PageStatus>('draft');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setHeroImage(page.heroImage ?? EMPTY_IMAGE);
        setThumbnailImage(page.thumbnailImage ?? EMPTY_IMAGE);
        setEditorType(page.editorType ?? 'rich');
        setBody(page.body ?? '');
        setBodyBlocks(page.bodyBlocks ?? []);
        setSections(page.sections ?? []);
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

  const addSection = (type: SectionType) => setSections((s) => [...s, createSection(type)]);

  const updateSection = (index: number, data: Record<string, unknown>) =>
    setSections((s) => s.map((section, i) => (i === index ? { ...section, data } : section)));

  const moveSection = (index: number, direction: -1 | 1) =>
    setSections((s) => {
      const next = [...s];
      const target = index + direction;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const removeSection = (index: number) => setSections((s) => s.filter((_, i) => i !== index));

  const save = async (nextStatus: PageStatus) => {
    if (!workspace || !id) return;
    if (!title.trim()) {
      setError('A title is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await pageService.update(workspace.id, id, {
        title: title.trim(),
        slug: slug || slugify(title),
        description,
        heroImage,
        thumbnailImage,
        editorType,
        body,
        bodyBlocks,
        sections,
        seo,
        status: nextStatus,
      });
      setStatus(saved.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the page');
    } finally {
      setSaving(false);
    }
  };

  return {
    workspace,
    title, setTitle,
    slug, setSlug,
    description, setDescription,
    heroImage, setHeroImage,
    thumbnailImage, setThumbnailImage,
    editorType,
    body, setBody,
    bodyBlocks, setBodyBlocks,
    sections, addSection, updateSection, moveSection, removeSection,
    seo, setSeo,
    status,
    loading, saving, error,
    save,
  };
}

export type PageEditorState = ReturnType<typeof usePageEditor>;
