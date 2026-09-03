import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon, Badge, Button, Card, Center, CopyButton, Group, Modal, Stack, Text,
  TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  IconPlus, IconCheck, IconCopy, IconArrowRight, IconEdit, IconArrowLeft,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { Workspace } from '@/types';

const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Manage every workspace this account belongs to: switch between them, create
 * new ones, rename the ones you can. Lives outside the `/:workspaceSlug` shell
 * so it works even when no workspace is "current".
 */
export function WorkspacesPage() {
  const navigate = useNavigate();
  const { workspaces, refresh } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Workspace | null>(null);

  const enter = (w: Workspace) => navigate(`/${w.slug}/dashboard`);

  return (
    <Center py="xl" px="md">
      <Stack gap="lg" w="100%" maw={720}>
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Workspaces</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Every workspace you belong to. Switch, rename, or start a new one.
            </Text>
          </div>
          <Group gap="xs">
            {workspaces.length > 0 && (
              <Button
                variant="default"
                leftSection={<IconArrowLeft size={15} />}
                onClick={() => navigate(`/${workspaces[0].slug}/dashboard`)}
              >
                Back to app
              </Button>
            )}
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
              New workspace
            </Button>
          </Group>
        </Group>

        <Stack gap="sm">
          {workspaces.map((w) => (
            <Card key={w.id} withBorder radius="md">
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Text fw={600} truncate>
                      {w.name}
                    </Text>
                    {w.role && (
                      <Badge size="sm" variant="light" tt="none" color="gray">
                        {w.role}
                      </Badge>
                    )}
                    {(w.role === 'owner' || w.role === 'admin') && (
                      <Tooltip label="Rename">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={() => setRenaming(w)}
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                  <Group gap={4} mt={2}>
                    <Text c="dimmed" size="xs" ff="monospace">
                      /{w.slug}
                    </Text>
                    <CopyButton value={w.id}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy workspace ID'}>
                          <ActionIcon variant="subtle" color="gray" size="xs" onClick={copy}>
                            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </div>
                <Button
                  variant="light"
                  rightSection={<IconArrowRight size={15} />}
                  onClick={() => enter(w)}
                >
                  Open
                </Button>
              </Group>
            </Card>
          ))}

          {workspaces.length === 0 && (
            <Card withBorder radius="md">
              <Stack align="center" gap="xs" py="lg">
                <Text fw={600}>No workspaces yet</Text>
                <Text c="dimmed" size="sm">
                  Create one to start adding content.
                </Text>
                <Button mt="xs" leftSection={<IconPlus size={15} />} onClick={() => setCreateOpen(true)}>
                  New workspace
                </Button>
              </Stack>
            </Card>
          )}
        </Stack>
      </Stack>

      <CreateWorkspaceModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (w) => {
          setCreateOpen(false);
          await refresh();
          navigate(`/${w.slug}/dashboard`);
        }}
      />

      <RenameWorkspaceModal
        key={renaming?.id ?? 'none'}
        workspace={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={async () => {
          setRenaming(null);
          await refresh();
        }}
      />
    </Center>
  );
}

function CreateWorkspaceModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (w: Workspace) => void;
}) {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = name.trim() ? null : 'Give your workspace a name';
  const urlError =
    !websiteUrl.trim() || /^https?:\/\/\S+\.\S+/.test(websiteUrl.trim())
      ? null
      : 'Enter a full URL, including https://';

  const submit = async () => {
    if (nameError || urlError) {
      setError(nameError ?? urlError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Workspace>('/workspaces', {
        name: name.trim(),
        websiteUrl: websiteUrl.trim(),
      });
      setName('');
      setWebsiteUrl('');
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the workspace');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New workspace" centered>
      <Stack>
        <TextInput
          label="Name"
          placeholder="Acme Inc."
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {name.trim() && (
          <Text size="xs" c="dimmed" ff="monospace">
            /{slugify(name) || 'workspace'}
          </Text>
        )}
        <TextInput
          label="Website URL"
          placeholder="https://yoursite.com (optional)"
          value={websiteUrl}
          error={error}
          onChange={(e) => setWebsiteUrl(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RenameWorkspaceModal({
  workspace,
  onClose,
  onRenamed,
}: {
  workspace: Workspace | null;
  onClose: () => void;
  onRenamed: () => void;
}) {
  // `key` on this component (the workspace id) resets state per open, so the
  // field can start seeded with the current name.
  const [name, setName] = useState(workspace?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!workspace) return;
    const next = name.trim() || workspace.name;
    setBusy(true);
    setError(null);
    try {
      await workspaceService.update(workspace.id, { name: next });
      notifications.show({ message: 'Workspace renamed', color: 'teal' });
      onRenamed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not rename');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      opened={workspace !== null}
      onClose={() => {
        setName('');
        onClose();
      }}
      title="Rename workspace"
      centered
    >
      <Stack>
        <TextInput
          label="Name"
          placeholder={workspace?.name}
          autoFocus
          value={name}
          error={error}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Text size="xs" c="dimmed">
          The URL slug does not change when you rename.
        </Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              setName('');
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
