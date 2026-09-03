import { useState } from 'react';
import {
  ActionIcon, Button, Card, ColorInput, Group, Stack, Table, Text, TextInput,
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
    key: 'groups' as const,
    min: 1,
    hosts: true,
  },
  tag: {
    title: 'Page tags',
    hint: 'Optional labels for filtering pages within a group.',
    key: 'tags' as const,
    min: 0,
    hosts: false,
  },
};

const DEFAULT_COLOR = '#868e96';

function blankTerm(): Term {
  return { name: '', color: DEFAULT_COLOR, previewHost: '', productionHost: '' };
}

/** Editable list of group or tag records. Each is replaced wholesale on save. */
export function TermsTab({ kind, workspaceId, terms, canManage, onSaved }: Props) {
  const copy = COPY[kind];
  const [rows, setRows] = useState<Term[]>(terms.map((t) => ({ ...t })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Term>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const dirty =
    rows.length !== terms.length ||
    rows.some(
      (r, i) =>
        r.name !== terms[i]?.name ||
        r.color !== terms[i]?.color ||
        r.previewHost !== terms[i]?.previewHost ||
        r.productionHost !== terms[i]?.productionHost
    );

  const save = async () => {
    const cleaned = rows
      .map((r) => ({ ...r, name: r.name.trim() }))
      .filter((r) => r.name);
    if (cleaned.length < copy.min) {
      setError(`Keep at least ${copy.min} ${kind}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const settings = await workspaceService.updateSettings(workspaceId, {
        configuration: { [copy.key]: cleaned },
      });
      onSaved(settings);
      setRows(settings.configuration[copy.key].map((t) => ({ ...t })));
      notifications.show({ message: `${copy.title} saved`, color: 'teal' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" maw={copy.hosts ? 780 : 520}>
      <Stack>
        <div>
          <Text fw={600}>{copy.title}</Text>
          <Text c="dimmed" size="sm">
            {copy.hint}
          </Text>
        </div>

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th w={150}>Colour</Table.Th>
              {copy.hosts && <Table.Th>Preview host</Table.Th>}
              {copy.hosts && <Table.Th>Production host</Table.Th>}
              {canManage && <Table.Th w={40} />}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" size="sm">
                    None yet.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {rows.map((row, i) => (
              <Table.Tr key={i}>
                <Table.Td>
                  <TextInput
                    value={row.name}
                    onChange={(e) => update(i, { name: e.currentTarget.value })}
                    disabled={!canManage}
                    placeholder={kind === 'group' ? 'Changelog' : 'featured'}
                  />
                </Table.Td>
                <Table.Td>
                  <ColorInput
                    value={row.color || DEFAULT_COLOR}
                    onChange={(v) => update(i, { color: v })}
                    disabled={!canManage}
                    withEyeDropper={false}
                    size="sm"
                  />
                </Table.Td>
                {copy.hosts && (
                  <Table.Td>
                    <TextInput
                      value={row.previewHost}
                      onChange={(e) => update(i, { previewHost: e.currentTarget.value })}
                      disabled={!canManage}
                      placeholder="preview.example.com"
                    />
                  </Table.Td>
                )}
                {copy.hosts && (
                  <Table.Td>
                    <TextInput
                      value={row.productionHost}
                      onChange={(e) => update(i, { productionHost: e.currentTarget.value })}
                      disabled={!canManage}
                      placeholder="example.com"
                    />
                  </Table.Td>
                )}
                {canManage && (
                  <Table.Td>
                    <ActionIcon variant="subtle" color="red" onClick={() => remove(i)} aria-label="Remove">
                      <IconTrash size={15} />
                    </ActionIcon>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {canManage && (
          <Group justify="space-between">
            <Button
              variant="light"
              leftSection={<IconPlus size={15} />}
              onClick={() => setRows([...rows, blankTerm()])}
            >
              Add {kind}
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
