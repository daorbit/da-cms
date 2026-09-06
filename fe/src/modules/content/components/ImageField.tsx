import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  TextInput,
  Center,
} from '@mantine/core';
import { IconPhoto, IconX, IconLibraryPhoto } from '@tabler/icons-react';
import { MediaPickerModal } from '@/modules/media/MediaPickerModal';
import type { PageImage } from '@/types';

interface Props {
  label: string;
  description?: string;
  value: PageImage;
  onChange: (value: PageImage) => void;
  /** Hero images are wide; thumbnails are close to square. */
  ratio?: number;
}

/**
 * A page's hero or thumbnail.
 *
 * Chosen from the workspace's media library, which is also where a new file is
 * uploaded — the picker uploads in place, so setting an image never means
 * leaving the page being edited. The URL field stays for an image hosted
 * somewhere else entirely.
 */
export function ImageField({ label, description, value, onChange, ratio = 16 / 9 }: Props) {
  const [picking, setPicking] = useState(false);
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
            <Stack align="center" gap={6}>
              <IconPhoto size={26} opacity={0.35} />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconLibraryPhoto size={14} />}
                onClick={() => setPicking(true)}
              >
                Choose from library
              </Button>
              <Text size="xs" c="dimmed">
                or paste a URL below
              </Text>
            </Stack>
          </Center>
        )}
      </Paper>

      {value.url && (
        <Button
          size="xs"
          variant="light"
          leftSection={<IconLibraryPhoto size={14} />}
          onClick={() => setPicking(true)}
        >
          Change image
        </Button>
      )}

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

      <MediaPickerModal
        opened={picking}
        onClose={() => setPicking(false)}
        title={`Choose ${label.toLowerCase()}`}
        kind="image"
        // The library's alt text is the asset's own description, so it carries
        // across — a caller can still override it in the field below.
        onSelect={(asset) => onChange({ url: asset.url, alt: asset.alt || value.alt })}
      />
    </Stack>
  );
}
