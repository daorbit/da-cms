import { Button, Image, Stack, Text, Title, Group, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { PageSection } from '@/types';

const str = (data: Record<string, unknown>, key: string) => String(data[key] ?? '');

/**
 * Renders one block roughly as it will publish.
 *
 * Approximate on purpose: this is a composition check — does the order read,
 * is anything empty — not a pixel-accurate render of the public site, which
 * this app does not own the templates for.
 */
export function SectionPreview({ section }: { section: PageSection }) {
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
      ) : (
        <Empty label="Empty rich text block" />
      );

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
      ) : (
        <Empty label="No image set" />
      );

    case 'cta':
      return (
        <Stack gap="sm" align="center" py="xl" ta="center">
          <Title order={3}>{str(data, 'heading') || 'Call to action'}</Title>
          {str(data, 'label') && <Button variant="light">{str(data, 'label')}</Button>}
        </Stack>
      );

    case 'features': {
      // One feature per line, which is how the inspector collects them.
      const items = str(data, 'items')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      return (
        <Stack gap="md" py="lg">
          {str(data, 'heading') && <Title order={3}>{str(data, 'heading')}</Title>}
          {items.length === 0 ? (
            <Empty label="No features listed" />
          ) : (
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
          )}
        </Stack>
      );
    }

    default:
      return null;
  }
}

function Empty({ label }: { label: string }) {
  return (
    <Text c="dimmed" size="sm" fs="italic" ta="center" py="lg">
      {label}
    </Text>
  );
}
