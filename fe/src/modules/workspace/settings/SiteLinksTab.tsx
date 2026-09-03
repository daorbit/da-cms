import { useState } from 'react';
import {
  ActionIcon, Button, Card, Group, Stack, Text, TextInput,
} from '@mantine/core';
import {
  IconPlus, IconTrash, IconArrowUp, IconArrowDown,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ApiError } from '@/lib/api';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { SiteLink, WorkspaceSettings } from '@/types';

interface Props {
  workspaceId: string;
  links: SiteLink[];
  canManage: boolean;
  onSaved: (settings: WorkspaceSettings) => void;
}

type Row = { label: string; url: string };

/** Ordered list of the published site's navigation links. */
export function SiteLinksTab({ workspaceId, links, canManage, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>(links.map(({ label, url }) => ({ label, url })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  const dirty =
    rows.length !== links.length ||
    rows.some((r, i) => r.label !== links[i]?.label || r.url !== links[i]?.url);

  const save = async () => {
    const cleaned = rows
      .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
      .filter((r) => r.label && r.url);
    setSaving(true);
    setError(null);
    try {
      const settings = await workspaceService.updateSettings(workspaceId, { siteLinks: cleaned });
      onSaved(settings);
      setRows(settings.siteLinks.map(({ label, url }) => ({ label, url })));
      notifications.show({ message: 'Site links saved', color: 'teal' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" maw={640}>
      <Stack>
        <div>
          <Text fw={600}>Site navigation</Text>
          <Text c="dimmed" size="sm">
            Links shown in the published site&apos;s nav, in order. URLs can be internal
            (<code>/blog</code>) or external.
          </Text>
        </div>

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        {rows.length === 0 && (
          <Text c="dimmed" size="sm">
            No links yet.
          </Text>
        )}

        <Stack gap="xs">
          {rows.map((row, i) => (
            <Group key={i} align="flex-start" wrap="nowrap">
              <TextInput
                placeholder="Label"
                value={row.label}
                onChange={(e) => update(i, { label: e.currentTarget.value })}
                disabled={!canManage}
                style={{ width: 160 }}
              />
              <TextInput
                placeholder="/path or https://…"
                value={row.url}
                onChange={(e) => update(i, { url: e.currentTarget.value })}
                disabled={!canManage}
                style={{ flex: 1 }}
              />
              {canManage && (
                <Group gap={2} wrap="nowrap">
                  <ActionIcon variant="subtle" color="gray" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    <IconArrowUp size={15} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label="Move down"
                  >
                    <IconArrowDown size={15} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => remove(i)} aria-label="Remove">
                    <IconTrash size={15} />
                  </ActionIcon>
                </Group>
              )}
            </Group>
          ))}
        </Stack>

        {canManage && (
          <Group justify="space-between">
            <Button
              variant="light"
              leftSection={<IconPlus size={15} />}
              onClick={() => setRows([...rows, { label: '', url: '' }])}
            >
              Add link
            </Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
