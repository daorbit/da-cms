import { useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

/**
 * The signed-in person's own details, as opposed to the workspace's.
 *
 * Email is shown but not editable: it is the login identity, and changing it
 * needs the same verification a signup does rather than a text field that
 * silently locks someone out.
 */
export function AccountTab() {
  const { user, setSession, refresh } = useAuth();

  return (
    <Stack gap="md">
      <ProfileCard user={user} onSaved={setSession} refresh={refresh} />
      <PasswordCard />
    </Stack>
  );
}

function ProfileCard({
  user,
  onSaved,
  refresh,
}: {
  user: User | null;
  onSaved: (user: User) => void;
  refresh: () => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [jobRole, setJobRole] = useState(user?.jobRole ?? '');
  const [busy, setBusy] = useState(false);

  const dirty = name.trim() !== (user?.name ?? '') || jobRole !== (user?.jobRole ?? '');

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api.patch<{ user: User }>('/auth/profile', {
        name: name.trim(),
        jobRole,
      });
      onSaved(res.user);
      // The sidebar reads the name from the session, so it has to be reloaded
      // for the change to show without a refresh.
      await refresh();
      notifications.show({ color: 'teal', message: 'Profile updated' });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not save your profile',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <div>
          <Text fw={600} size="sm">
            Profile
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            How you appear across this workspace.
          </Text>
        </div>

        <TextInput
          label="Name"
          withAsterisk
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />

        <TextInput
          label="Email"
          description="Used to sign in. Contact support to change it."
          value={user?.email ?? ''}
          disabled
        />

        <TextInput
          label="Role"
          placeholder="e.g. Editor, Marketing"
          value={jobRole}
          onChange={(e) => setJobRole(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="xs">
          <Button loading={busy} disabled={!dirty || !name.trim()} onClick={save}>
            Save changes
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current.length > 0 && next.length >= 8 && next === confirm;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await api.post('/auth/password', { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      notifications.show({ color: 'teal', message: 'Password changed' });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not change your password',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <div>
          <Text fw={600} size="sm">
            Password
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            At least 8 characters.
          </Text>
        </div>

        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.currentTarget.value)}
        />

        <Divider my={4} />

        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.currentTarget.value)}
          error={next.length > 0 && next.length < 8 ? 'At least 8 characters' : null}
        />

        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          error={mismatch ? 'Passwords do not match' : null}
        />

        <Group justify="flex-end" mt="xs">
          <Button loading={busy} disabled={!ready} onClick={save}>
            Change password
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
