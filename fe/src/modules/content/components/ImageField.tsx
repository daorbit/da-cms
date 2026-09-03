import { ActionIcon, Group, Image, Paper, Stack, Text, TextInput, Center } from '@mantine/core';
import { IconPhoto, IconX } from '@tabler/icons-react';
import type { PageImage } from '@/types';

interface Props {
  label: string;
  description?: string;
  value: PageImage;
  onChange: (value: PageImage) => void;
  /** Hero images are wide; thumbnails are close to square. */
  ratio?: number;
}

export function ImageField({ label, description, value, onChange, ratio = 16 / 9 }: Props) {
  const set = (patch: Partial<PageImage>) => onChange({ ...value, ...patch });

  return (
    <Stack gap="xs">
      <div>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
      </div>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        {value.url ? (
          <div style={{ position: 'relative', aspectRatio: ratio }}>
            <Image
              src={value.url}
              alt={value.alt}
              h="100%"
              w="100%"
              fit="cover"
              // A bad URL would otherwise leave a broken-image icon with no way
              // to tell it apart from a slow load.
              fallbackSrc="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>"
            />
            <ActionIcon
              variant="filled"
              color="dark"
              size="sm"
              style={{ position: 'absolute', top: 8, right: 8 }}
              onClick={() => onChange({ url: '', alt: '' })}
              aria-label={`Remove ${label}`}
            >
              <IconX size={14} />
            </ActionIcon>
          </div>
        ) : (
          <Center style={{ aspectRatio: ratio }}>
            <Stack align="center" gap={4}>
              <IconPhoto size={26} opacity={0.35} />
              <Text size="xs" c="dimmed">
                Paste an image URL below
              </Text>
            </Stack>
          </Center>
        )}
      </Paper>

      <Group grow gap="xs" align="flex-start">
        <TextInput
          placeholder="https://…"
          size="xs"
          value={value.url}
          onChange={(e) => set({ url: e.currentTarget.value })}
        />
        <TextInput
          placeholder="Alt text"
          size="xs"
          value={value.alt}
          onChange={(e) => set({ alt: e.currentTarget.value })}
        />
      </Group>
    </Stack>
  );
}
