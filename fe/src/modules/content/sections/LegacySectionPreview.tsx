import { Button, Image, Stack, Text, Title, Group, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { PageSection } from '@/types';

const str = (data: Record<string, unknown>, key: string) => String(data[key] ?? '');

/**
 * Read-only render of a block from the old, now-removed sections panel.
 *
 * New pages never write `sections` any more — hero/CTA/features are TipTap
 * blocks inside `body` instead — but pages saved before that switch still
 * have this data, so the preview keeps rendering it rather than silently
 * dropping content someone already wrote.
 */
export function LegacySectionPreview({ section }: { section: PageSection }) {
  const { data } = section;

  switch (section.type) {
    case 'hero':
      return (
        <Stack gap="sm" align="center" py="xl" px="md" ta="center">
          <Title order={2}>{str(data, 'heading') || 'Untitled hero'}</Title>
          {str(data, 'subheading') && (
            <Text c="dimmed" maw={520}>
              {str(data, 'subheading')}
            </Text>
          )}
          {str(data, 'ctaLabel') && <Button mt="xs">{str(data, 'ctaLabel')}</Button>}
        </Stack>
      );

    case 'richtext':
      return str(data, 'body') ? (
        <Text py="md" style={{ whiteSpace: 'pre-wrap' }}>
          {str(data, 'body')}
        </Text>
      ) : null;

    case 'image':
      return str(data, 'src') ? (
        <Stack gap={6} py="md">
          <Image src={str(data, 'src')} alt={str(data, 'alt')} radius="md" />
          {str(data, 'caption') && (
            <Text size="xs" c="dimmed" ta="center">
              {str(data, 'caption')}
            </Text>
          )}
        </Stack>
      ) : null;

    case 'cta':
      return (
        <Stack gap="sm" align="center" py="xl" ta="center">
          <Title order={3}>{str(data, 'heading') || 'Call to action'}</Title>
          {str(data, 'label') && <Button variant="light">{str(data, 'label')}</Button>}
        </Stack>
      );

    case 'features': {
      const items = str(data, 'items')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (items.length === 0 && !str(data, 'heading')) return null;

      return (
        <Stack gap="md" py="lg">
          {str(data, 'heading') && <Title order={3}>{str(data, 'heading')}</Title>}
          <Stack gap="xs">
            {items.map((item) => (
              <Group key={item} gap="sm" wrap="nowrap">
                <ThemeIcon size="sm" radius="xl" variant="light">
                  <IconCheck size={12} />
                </ThemeIcon>
                <Text size="sm">{item}</Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      );
    }

    default:
      return null;
  }
}
