import { ActionIcon, Badge, Button, Group, SegmentedControl, Text, Tooltip } from '@mantine/core';
import {
  IconArrowLeft, IconDeviceFloppy, IconSettings, IconPencil, IconEye,
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
  mode: 'edit' | 'preview';
  onModeChange: (mode: 'edit' | 'preview') => void;
  saving: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onSave: () => void;
  onPublishToggle: () => void;
}

export function PageEditorToolbar({
  title, slug, status, mode, onModeChange, saving, onBack, onOpenSettings, onSave, onPublishToggle,
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
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={(value) => onModeChange(value as 'edit' | 'preview')}
          data={[
            { value: 'edit', label: <ModeLabel icon={<IconPencil size={13} />} text="Edit" /> },
            { value: 'preview', label: <ModeLabel icon={<IconEye size={13} />} text="Preview" /> },
          ]}
        />

        <Tooltip label="Page settings" withArrow>
          <ActionIcon variant="default" size="lg" aria-label="Page settings" onClick={onOpenSettings}>
            <IconSettings size={17} />
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

function ModeLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      {icon}
      <span>{text}</span>
    </Group>
  );
}
