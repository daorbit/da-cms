import {
  ActionIcon,
  Box,
  Divider,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { IconX, IconSearch } from '@tabler/icons-react';
import { ImageField } from '@/modules/content/components/ImageField';
import type { PageImage, PageSeo } from '@/types';
import classes from './SeoPanel.module.css';

interface Props {
  seo: PageSeo;
  onChange: (seo: PageSeo) => void;
  onClose: () => void;
  /** Fall-backs, so each field's placeholder shows what would be used instead. */
  pageTitle: string;
  pageDescription: string;
  heroImage: PageImage;
}

/** Google truncates around here; past it the tail is replaced with an ellipsis. */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

/**
 * Search and social metadata, beside the editor rather than behind a modal.
 *
 * A writer tunes a meta description against the copy it summarises, so the two
 * need to be visible at once — which a dialog over the document cannot do.
 */
export function SeoPanel({
  seo,
  onChange,
  onClose,
  pageTitle,
  pageDescription,
  heroImage,
}: Props) {
  const set = (patch: Partial<PageSeo>) => onChange({ ...seo, ...patch });

  return (
    <Box className={classes.panel}>
      <Group justify="space-between" px="md" py="sm" className={classes.header}>
        <Group gap={8}>
          <IconSearch size={16} />
          <Text fw={600} size="sm">
            SEO &amp; social
          </Text>
        </Group>
        <Tooltip label="Close" withArrow>
          <ActionIcon variant="subtle" color="gray" aria-label="Close SEO panel" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Stack gap="md" p="md">
          <Stack gap="xs">
            <Label>Search engines</Label>

            <div>
              <TextInput
                label="Meta title"
                size="xs"
                placeholder={pageTitle || 'Page title'}
                value={seo.title}
                onChange={(e) => set({ title: e.currentTarget.value })}
              />
              <CharCount value={seo.title || pageTitle} limit={TITLE_LIMIT} />
            </div>

            <div>
              <Textarea
                label="Meta description"
                size="xs"
                autosize
                minRows={3}
                placeholder={pageDescription || 'A short summary for search results.'}
                value={seo.description}
                onChange={(e) => set({ description: e.currentTarget.value })}
              />
              <CharCount
                value={seo.description || pageDescription}
                limit={DESCRIPTION_LIMIT}
              />
            </div>

            <TextInput
              label="Canonical URL"
              description="The version of this page search engines should treat as the original."
              size="xs"
              placeholder="https://example.com/page"
              value={seo.canonicalUrl}
              onChange={(e) => set({ canonicalUrl: e.currentTarget.value })}
            />

            <TextInput
              label="Keywords"
              description="Comma-separated. Ignored by Google; read by some other engines."
              size="xs"
              placeholder="analytics, privacy"
              value={seo.keywords}
              onChange={(e) => set({ keywords: e.currentTarget.value })}
            />
          </Stack>

          <Divider />

          <Stack gap="xs">
            <Label>Social card</Label>
            <Text size="xs" c="dimmed" mt={-6}>
              How a link to this page looks when it is shared.
            </Text>

            <TextInput
              label="Title"
              size="xs"
              placeholder={seo.title || pageTitle || 'Page title'}
              value={seo.ogTitle}
              onChange={(e) => set({ ogTitle: e.currentTarget.value })}
            />

            <Textarea
              label="Description"
              size="xs"
              autosize
              minRows={2}
              placeholder={seo.description || pageDescription || 'Page description'}
              value={seo.ogDescription}
              onChange={(e) => set({ ogDescription: e.currentTarget.value })}
            />

            {/* Falls back to the hero image, which is usually the right one. */}
            <ImageField
              label="Share image"
              description={heroImage.url ? 'Defaults to the hero image.' : undefined}
              value={{ url: seo.ogImage, alt: '' }}
              onChange={(v) => set({ ogImage: v.url })}
              ratio={1.91}
            />

            <Group grow align="flex-start">
              <Select
                label="Page type"
                size="xs"
                data={[
                  { value: 'article', label: 'Article' },
                  { value: 'website', label: 'Website' },
                  { value: 'product', label: 'Product' },
                ]}
                value={seo.ogType || 'article'}
                onChange={(v) => set({ ogType: v ?? 'article' })}
              />
              <Select
                label="Card size"
                size="xs"
                data={[
                  { value: 'summary_large_image', label: 'Large image' },
                  { value: 'summary', label: 'Small' },
                ]}
                value={seo.twitterCard || 'summary_large_image'}
                onChange={(v) => set({ twitterCard: v ?? 'summary_large_image' })}
              />
            </Group>
          </Stack>

          <Divider />

          <Stack gap="sm">
            <Label>Indexing</Label>

            <Switch
              size="sm"
              label="Hide from search engines"
              description="Adds noindex, so this page is not listed in results."
              checked={seo.noIndex}
              onChange={(e) => set({ noIndex: e.currentTarget.checked })}
            />

            <Switch
              size="sm"
              label="Do not follow links"
              description="Adds nofollow, so crawlers do not follow links out of this page."
              checked={seo.noFollow}
              onChange={(e) => set({ noFollow: e.currentTarget.checked })}
            />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
      {children}
    </Text>
  );
}

/**
 * A length against its limit.
 *
 * Over the limit is not an error — the text is still valid, it is simply going
 * to be cut short in a result — so it is amber rather than red.
 */
function CharCount({ value, limit }: { value: string; limit: number }) {
  const length = value.length;
  const over = length > limit;

  return (
    <Text size="10px" c={over ? 'orange' : 'dimmed'} ta="right" mt={2}>
      {length}/{limit}
      {over ? ' · will be truncated' : ''}
    </Text>
  );
}

