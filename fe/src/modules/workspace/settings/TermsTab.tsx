import { useState } from 'react';
import {
  ActionIcon, Badge, Button, Card, Group, Stack, Text, TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ApiError } from '@/lib/api';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { Term, WorkspaceSettings } from '@/types';

interface Props {
  kind: 'group' | 'tag';
  workspaceId: string;
  terms: Term[];
  canManage: boolean;
  onSaved: (settings: WorkspaceSettings) => void;
}

const COPY = {
  group: {
    title: 'Page groups',
    hint: 'Every page belongs to exactly one group — Blog, Case study, and so on.',
    field: 'pageGroups' as const,
    min: 1,
  },
  tag: {
    title: 'Page tags',
    hint: 'Optional labels for filtering pages within a group.',
    field: 'pageTags' as const,
    min: 0,
  },
};

/** Editable list of group or tag names. Slugs are derived server-side. */
export function TermsTab({ kind, workspaceId, terms, canManage, onSaved }: Props) {
  const copy = COPY[kind];
  const [names, setNames] = useState<string[]>(terms.map((t) => t.name));
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const value = draft.trim();
    if (!value || names.some((n) => n.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    setNames([...names, value]);
    setDraft('');
  };

  const remove = (name: string) => setNames(names.filter((n) => n !== name));

  const dirty =
    names.length !== terms.length || names.some((n, i) => n !== terms[i]?.name);

  const save = async () => {
    if (names.length < copy.min) {
      setError(`Keep at least ${copy.min} ${kind}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const settings = await workspaceService.updateSettings(workspaceId, { [copy.field]: names });
      onSaved(settings);
      notifications.show({ message: `${copy.title} saved`, color: 'teal' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" maw={560}>
      <Stack>
        <div>
          <Text fw={600}>{copy.title}</Text>
          <Text c="dimmed" size="sm">
            {copy.hint}
          </Text>
        </div>

        <Group gap="xs">
          {names.length === 0 && (
            <Text c="dimmed" size="sm">
              None yet.
            </Text>
          )}
          {names.map((name) => (
            <Badge
              key={name}
              variant="light"
              color="gray"
              size="lg"
              tt="none"
              rightSection={
                canManage ? (
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="gray"
                    onClick={() => remove(name)}
                    aria-label={`Remove ${name}`}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                ) : null
              }
            >
              {name}
            </Badge>
          ))}
        </Group>

        {canManage && (
          <>
            <Group>
              <TextInput
                placeholder={kind === 'group' ? 'e.g. Changelog' : 'e.g. featured'}
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
                style={{ flex: 1 }}
                error={error}
              />
              <Button variant="light" leftSection={<IconPlus size={15} />} onClick={add}>
                Add
              </Button>
            </Group>

            <Group justify="flex-end">
              <Button onClick={save} loading={saving} disabled={!dirty}>
                Save changes
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
