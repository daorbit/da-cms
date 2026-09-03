import { useState } from 'react';
import { Button, Card, Group, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { Workspace } from '@/types';

/** Name + published-site URL. Owner/admin only for editing. */
export function GeneralTab({ workspace, canManage }: { workspace: Workspace; canManage: boolean }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(workspace.name);
  const [websiteUrl, setWebsiteUrl] = useState(workspace.websiteUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name.trim() !== workspace.name || websiteUrl.trim() !== workspace.websiteUrl;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await workspaceService.update(workspace.id, { name: name.trim(), websiteUrl: websiteUrl.trim() });
      await refresh();
      notifications.show({ message: 'Workspace updated', color: 'teal' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" maw={560}>
      <Stack>
        <TextInput
          label="Workspace name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          disabled={!canManage}
        />
        <TextInput
          label="Website URL"
          description="Where this workspace publishes."
          placeholder="https://example.com"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.currentTarget.value)}
          disabled={!canManage}
          error={error}
        />
        {canManage && (
          <Group justify="flex-end">
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
