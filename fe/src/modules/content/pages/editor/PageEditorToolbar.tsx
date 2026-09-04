import { ActionIcon, Badge, Button, Group, Text, Tooltip } from '@mantine/core';
import {
  IconArrowLeft, IconDeviceFloppy, IconAdjustments, IconEye,
} from '@tabler/icons-react';
import type { PageStatus } from '@/types';

const STATUS_COLOR: Record<PageStatus, string> = {
  draft: 'gray',
  published: 'teal',
  archived: 'orange',
};

interface Props {
  title: string;
  slug: string;
  status: PageStatus;
  saving: boolean;
  onBack: () => void;
  onOpenDetails: () => void;
  onPreview: () => void;
  onSave: () => void;
  onPublishToggle: () => void;
}

export function PageEditorToolbar({
  title, slug, status, saving, onBack, onOpenDetails, onPreview, onSave, onPublishToggle,
}: Props) {
  return (
    // One bar, no breadcrumbs: the back button already says where this goes,
    // and a trail above it repeated the same two words.
    <Group justify="space-between" align="center" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Back to pages" onClick={onBack}>
          <IconArrowLeft size={18} />
        </ActionIcon>

        <div style={{ minWidth: 0 }}>
          <Text fw={600} truncate>
            {title || 'Untitled'}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace" truncate>
            /{slug}
          </Text>
        </div>

        <Badge variant="light" color={STATUS_COLOR[status]}>
          {status}
        </Badge>
      </Group>

      <Group gap="xs" wrap="nowrap">
        <Tooltip label="Preview content" withArrow>
          <ActionIcon variant="default" size="lg" aria-label="Preview content" onClick={onPreview}>
            <IconEye size={17} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Page details" withArrow>
          <ActionIcon variant="default" size="lg" aria-label="Page details" onClick={onOpenDetails}>
            <IconAdjustments size={17} />
          </ActionIcon>
        </Tooltip>

        <Button
          variant="default"
          loading={saving}
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={onSave}
        >
          Save
        </Button>

        {status === 'published' ? (
          <Button variant="light" color="orange" loading={saving} onClick={onPublishToggle}>
            Unpublish
          </Button>
        ) : (
          <Button loading={saving} onClick={onPublishToggle}>
            Publish
          </Button>
        )}
      </Group>
    </Group>
  );
}
