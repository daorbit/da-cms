import { useEffect, useState } from 'react';
import { ActionIcon, Button, Divider, Group, Text, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconAdjustments, IconEye, IconHistory } from '@tabler/icons-react';
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
  /** Whether there are edits the server has not seen. */
  dirty: boolean;
  /** When the page was last written, for the save indicator. */
  savedAt: Date | null;
  onBack: () => void;
  onOpenDetails: () => void;
  onPreview: () => void;
  onOpenHistory: () => void;
  onSave: () => void;
  onPublishToggle: () => void;
}

export function PageEditorToolbar({
  title, status, savingAction, dirty, savedAt, onBack, onOpenDetails, onPreview,
  onOpenHistory, onSave, onPublishToggle,
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
        {/* Says whether the work is safe. A spinner alone left it ambiguous
            whether a save had actually landed. */}
        <SaveState busy={busy} dirty={dirty} savedAt={savedAt} />

        <Tooltip label="Preview content" withArrow>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Preview content" onClick={onPreview}>
            <IconEye size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Version history" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Version history"
            onClick={onOpenHistory}
          >
            <IconHistory size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Page details" withArrow>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Page details" onClick={onOpenDetails}>
            <IconAdjustments size={18} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" my={6} />

        <Tooltip label={dirty ? 'Save (Ctrl+S)' : 'No changes to save'} withArrow>
          <Button
            variant="default"
            loading={savingAction === 'save'}
            disabled={(busy && savingAction !== 'save') || !dirty}
            onClick={onSave}
          >
            Save
          </Button>
        </Tooltip>

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

/** Unsaved / saving / last-saved, in one line of quiet text. */
function SaveState({
  busy,
  dirty,
  savedAt,
}: {
  busy: boolean;
  dirty: boolean;
  savedAt: Date | null;
}) {
  // Re-rendered on a timer so "2 minutes ago" does not go stale while the
  // writer is sitting on the page.
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (busy) {
    return (
      <Text size="xs" c="dimmed">
        Saving…
      </Text>
    );
  }

  if (dirty) {
    return (
      <Group gap={5} wrap="nowrap">
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--mantine-color-orange-6)',
          }}
        />
        <Text size="xs" c="dimmed">
          Unsaved changes
        </Text>
      </Group>
    );
  }

  if (!savedAt) return null;

  return (
    <Text size="xs" c="dimmed">
      Saved {relativeTime(savedAt)}
    </Text>
  );
}

/** "just now" / "5 minutes ago" — enough to answer "did that save?". */
function relativeTime(at: Date): string {
  const seconds = Math.round((Date.now() - at.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  return at.toLocaleDateString();
}
