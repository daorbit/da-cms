import type { SectionType, PageSection } from '@/types';

export type SectionFieldType = 'text' | 'textarea' | 'url';

export interface SectionField {
  key: string;
  label: string;
  type: SectionFieldType;
  placeholder?: string;
}

export interface SectionDefinition {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  fields: SectionField[];
  defaults: Record<string, unknown>;
}

/**
 * One entry per block type. The editor renders its inspector straight from
 * `fields`, so adding a section means adding a definition here — no new form
 * component, no switch statement to keep in sync.
 */
export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Headline, subtext and a call to action',
    icon: 'layout',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Build something great' },
      { key: 'subheading', label: 'Subheading', type: 'textarea', placeholder: 'A sentence that explains the product.' },
      { key: 'ctaLabel', label: 'Button label', type: 'text', placeholder: 'Get started' },
      { key: 'ctaHref', label: 'Button link', type: 'url', placeholder: '/signup' },
    ],
    defaults: { heading: 'New hero section', subheading: '', ctaLabel: '', ctaHref: '' },
  },

  richtext: {
    type: 'richtext',
    label: 'Rich text',
    description: 'A block of body copy',
    icon: 'text',
    fields: [
      { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Write your content…' },
    ],
    defaults: { body: '' },
  },

  image: {
    type: 'image',
    label: 'Image',
    description: 'A single image with a caption',
    icon: 'photo',
    fields: [
      { key: 'src', label: 'Image URL', type: 'url', placeholder: 'https://…' },
      { key: 'alt', label: 'Alt text', type: 'text', placeholder: 'Describe the image' },
      { key: 'caption', label: 'Caption', type: 'text' },
    ],
    defaults: { src: '', alt: '', caption: '' },
  },

  cta: {
    type: 'cta',
    label: 'Call to action',
    description: 'A banner that pushes one action',
    icon: 'click',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Ready to start?' },
      { key: 'label', label: 'Button label', type: 'text', placeholder: 'Sign up' },
      { key: 'href', label: 'Button link', type: 'url', placeholder: '/signup' },
    ],
    defaults: { heading: '', label: '', href: '' },
  },

  features: {
    type: 'features',
    label: 'Features',
    description: 'A short list of selling points',
    icon: 'list',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Why us' },
      {
        key: 'items',
        label: 'Items (one per line)',
        type: 'textarea',
        placeholder: 'Fast\nSecure\nSimple',
      },
    ],
    defaults: { heading: '', items: '' },
  },
};

export const SECTION_LIST = Object.values(SECTION_DEFINITIONS);

/** Ids only need to be unique within one page, so a counter-free random is fine. */
export function createSection(type: SectionType): PageSection {
  const definition = SECTION_DEFINITIONS[type];
  return {
    key: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    data: { ...definition.defaults },
  };
}
