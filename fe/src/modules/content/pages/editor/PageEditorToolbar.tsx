import { ActionIcon, Button, Divider, Group, Text, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconAdjustments, IconEye } from '@tabler/icons-react';
import type { PageStatus } from '@/types';

const STATUS_DOT: Record<PageStatus, string> = {
  draft: 'var(--mantine-color-gray-5)',
  published: 'var(--mantine-color-teal-6)',
  archived: 'var(--mantine-color-orange-6)',
};

interface Props {
  title: string;
  status: PageStatus;
  /** Which action is in flight, so only that button spins. */
  savingAction: 'save' | 'publish' | null;
  onBack: () => void;
  onOpenDetails: () => void;
  onPreview: () => void;
  onSave: () => void;
  onPublishToggle: () => void;
}

export function PageEditorToolbar({
  title, status, savingAction, onBack, onOpenDetails, onPreview, onSave, onPublishToggle,
}: Props) {
  const busy = savingAction !== null;
  const published = status === 'published';

  return (
    // One bar, no breadcrumbs: the back button already says where this goes.
    <Group justify="space-between" align="center" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Back to pages" onClick={onBack}>
          <IconArrowLeft size={18} />
        </ActionIcon>

        <Text fw={600} truncate>
          {title || 'Untitled'}
        </Text>

        <Tooltip label={status} withArrow>
          <span
            aria-label={status}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: STATUS_DOT[status],
              flexShrink: 0,
            }}
          />
        </Tooltip>
      </Group>

      <Group gap="xs" wrap="nowrap">
        <Tooltip label="Preview content" withArrow>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Preview content" onClick={onPreview}>
            <IconEye size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Page details" withArrow>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Page details" onClick={onOpenDetails}>
            <IconAdjustments size={18} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" my={6} />

        <Button
          variant="default"
          loading={savingAction === 'save'}
          disabled={busy && savingAction !== 'save'}
          onClick={onSave}
        >
          Save
        </Button>

        <Button
          variant={published ? 'subtle' : 'filled'}
          color={published ? 'gray' : undefined}
          loading={savingAction === 'publish'}
          disabled={busy && savingAction !== 'publish'}
          onClick={onPublishToggle}
        >
          {published ? 'Unpublish' : 'Publish'}
        </Button>
      </Group>
    </Group>
  );
}
