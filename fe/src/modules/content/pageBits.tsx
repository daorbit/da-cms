import { useState } from 'react';
import { IconPhoto } from '@tabler/icons-react';
import type { PageImage, PageSeo } from '@/types';
import { MediaPickerModal } from '@/modules/media/MediaPickerModal';
import { Button, type CheckItem } from './ui';

/* ---------------------------------------------------------- page checks --- */

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const wordCount = (html: string) => {
  const t = text(html || '');
  return t ? t.split(' ').length : 0;
};

export const sectionCount = (html: string) => (html?.match(/<h2[\s>]/g) ?? []).length;

export interface CheckablePage {
  title: string;
  content?: string;
  heroImage: PageImage;
  thumbnailImage: PageImage;
  seo: Pick<PageSeo, 'title' | 'description'>;
}

/**
 * What a page should have before it goes live.
 *
 * `required` blocks publishing; `recommended` only warns, because a page can
 * reasonably go out without, say, a meta description — the user is asked
 * rather than refused.
 */
export function pageChecks(p: CheckablePage, opts: { hasContent?: boolean } = {}) {
  const hasContent = opts.hasContent ?? wordCount(p.content ?? '') > 0;
  const required: CheckItem[] = [
    { ok: p.title.trim().length > 0, label: 'Title' },
    { ok: hasContent, label: 'Body content' },
  ];
  const recommended: CheckItem[] = [
    { ok: !!p.heroImage?.url, label: 'Hero image' },
    { ok: !!p.thumbnailImage?.url, label: 'Thumbnail' },
    { ok: p.seo.title.trim().length > 0, label: 'SEO title' },
    { ok: p.seo.description.trim().length > 0, label: 'Meta description' },
  ];
  return {
    all: [...required, ...recommended],
    missingRequired: required.filter((c) => !c.ok),
    missingRecommended: recommended.filter((c) => !c.ok),
  };
}

/** "SEO title" stays as is; anything else reads in lower case mid-sentence. */
export const inSentence = (items: CheckItem[]) =>
  items.map((c) => (c.label.startsWith('SEO') ? c.label : c.label.toLowerCase())).join(', ');

/* ------------------------------------------------------------- previews --- */

interface PreviewProps {
  site: string;
  path: string;
  title: string;
  description: string;
}

/** Roughly how the page reads as a Google result. */
export function GooglePreview({ site, path, title, description }: PreviewProps) {
  return (
    <div className="rounded-md border border-line bg-surface p-3.5">
      <p className="truncate text-xs text-muted">
        {site} › {path}
      </p>
      <p className="mt-1 line-clamp-1 text-[16px] text-[#1a0dab] dark:text-[#8ab4f8]">{title || 'Untitled page'}</p>
      <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-fg-2">
        {description || <span className="text-faint italic">No description yet. Search engines will pick text from the page.</span>}
      </p>
    </div>
  );
}

/** The card a link to this page unfurls into on social apps and chat. */
export function SocialPreview({ site, title, image }: { site: string; title: string; image: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      {image ? (
        <img src={image} alt="" className="aspect-[1200/630] w-full object-cover" />
      ) : (
        <div className="grid aspect-[1200/630] place-items-center bg-surface-2 text-sm text-faint">No thumbnail</div>
      )}
      <div className="border-t border-line px-3 py-2.5">
        <p className="truncate text-[11px] uppercase text-muted">{site}</p>
        <p className="line-clamp-1 text-sm font-semibold text-fg">{title || 'Untitled page'}</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- image slot --- */

/** A hero or thumbnail, picked from the media library (which also uploads in place). */
export function ImageSlot({
  label, hint, value, onChange,
}: { label: string; hint?: string; value: PageImage; onChange: (v: PageImage) => void }) {
  const [picking, setPicking] = useState(false);
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-fg">{label}</p>
      {value.url ? (
        <div className="group relative overflow-hidden rounded-md border border-line">
          <img src={value.url} alt={value.alt} className="aspect-[1200/630] w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <Button size="sm" onClick={() => setPicking(true)}>Replace</Button>
            <Button size="sm" onClick={() => onChange({ url: '', alt: '' })}>Remove</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="grid aspect-[1200/630] w-full place-items-center rounded-md border-2 border-dashed border-line-strong text-sm text-muted hover:border-accent hover:text-accent-text"
        >
          <span className="flex flex-col items-center gap-1.5">
            <IconPhoto size={20} stroke={1.6} />
            Choose from media
          </span>
        </button>
      )}
      {value.url && (
        <input
          className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-fg placeholder:text-faint focus:border-accent focus:outline-none"
          placeholder="Alt text: what the image shows"
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}

      <MediaPickerModal
        opened={picking}
        kind="image"
        title={`Choose a ${label.toLowerCase()}`}
        onClose={() => setPicking(false)}
        onSelect={(asset) => {
          onChange({ url: asset.url, alt: asset.alt ?? value.alt ?? '' });
          setPicking(false);
        }}
      />
    </div>
  );
}
