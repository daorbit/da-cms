import { useEffect, useState } from 'react';
import {
  ActionIcon, Alert, Badge, Button, Card, CopyButton, Group, Menu, Modal,
  Select, Stack, Table, Text, TextInput, Tooltip,
} from '@mantine/core';
import {
  IconDots, IconTrash, IconMail, IconCopy, IconCheck, IconUserPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { Workspace, WorkspaceMember } from '@/types';

const ROLE_COLOR: Record<string, string> = { owner: 'blue', admin: 'grape', editor: 'gray' };
const ASSIGNABLE = [
  { value: 'editor', label: 'Editor — content only' },
  { value: 'admin', label: 'Admin — manage members & settings' },
];

export function MembersTab({ workspace, canManage }: { workspace: Workspace; canManage: boolean }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor'>('editor');
  const [inviting, setInviting] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const [pendingRemove, setPendingRemove] = useState<WorkspaceMember | null>(null);

  const load = () => {
    setLoading(true);
    workspaceService
      .members(workspace.id)
      .then((res) => {
        setMembers(res.members);
        setInvites(res.invites);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load members'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [workspace.id]);

  const sendInvite = async () => {
    setInviting(true);
    setError(null);
    try {
      const { acceptUrl } = await workspaceService.invite(workspace.id, inviteEmail.trim(), inviteRole);
      setLastLink(acceptUrl);
      setInviteEmail('');
      notifications.show({ message: 'Invite sent', color: 'teal' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send invite');
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (m: WorkspaceMember, role: 'admin' | 'editor') => {
    try {
      await workspaceService.setMemberRole(workspace.id, m.id, role);
      load();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Could not change role',
        color: 'red',
      });
    }
  };

  const removeMember = async () => {
    if (!pendingRemove) return;
    try {
      await workspaceService.removeMember(workspace.id, pendingRemove.id);
      setPendingRemove(null);
      load();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Could not remove member',
        color: 'red',
      });
    }
  };

  const resend = async (invite: WorkspaceMember) => {
    try {
      const { acceptUrl } = await workspaceService.resendInvite(workspace.id, invite.id);
      setLastLink(acceptUrl);
      notifications.show({ message: 'Invite re-sent', color: 'teal' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Could not resend',
        color: 'red',
      });
    }
  };

  const revoke = async (invite: WorkspaceMember) => {
    try {
      await workspaceService.revokeInvite(workspace.id, invite.id);
      load();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Could not revoke',
        color: 'red',
      });
    }
  };

  return (
    <Stack gap="lg">
      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Group justify="space-between">
        <Text fw={600}>Team members</Text>
        {canManage && (
          <Button
            leftSection={<IconUserPlus size={15} />}
            onClick={() => {
              setInviteOpen(true);
              setLastLink(null);
            }}
          >
            Invite
          </Button>
        )}
      </Group>

      <Card withBorder radius="md" p={0}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Member</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th w={50} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    Loading…
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              members.map((m) => {
                const isSelf = m.user.id === user?.id;
                return (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      <Text fw={500}>
                        {m.user.name ?? m.user.email}
                        {isSelf && (
                          <Text span c="dimmed" size="xs">
                            {' '}
                            (you)
                          </Text>
                        )}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {m.user.email}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {canManage && m.role !== 'owner' ? (
                        <Select
                          size="xs"
                          w={140}
                          value={m.role}
                          data={ASSIGNABLE}
                          allowDeselect={false}
                          onChange={(v) => v && changeRole(m, v as 'admin' | 'editor')}
                        />
                      ) : (
                        <Badge variant="light" color={ROLE_COLOR[m.role]} tt="none">
                          {m.role}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {canManage && m.role !== 'owner' && (
                        <Menu position="bottom-end" width={160}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => setPendingRemove(m)}
                            >
                              {m.user.id === user?.id ? 'Leave workspace' : 'Remove'}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {invites.length > 0 && (
        <>
          <Text fw={600}>Pending invites</Text>
          <Card withBorder radius="md" p={0}>
            <Table verticalSpacing="sm">
              <Table.Tbody>
                {invites.map((inv) => (
                  <Table.Tr key={inv.id}>
                    <Table.Td>
                      <Text size="sm">{inv.user.email}</Text>
                      <Text c="dimmed" size="xs">
                        {`Invited as ${inv.role}`}
                      </Text>
                    </Table.Td>
                    <Table.Td w={120}>
                      <Badge variant="light" color="yellow" tt="none">
                        pending
                      </Badge>
                    </Table.Td>
                    {canManage && (
                      <Table.Td w={50}>
                        <Menu position="bottom-end" width={150}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconMail size={14} />} onClick={() => resend(inv)}>
                              Resend
                            </Menu.Item>
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => revoke(inv)}
                            >
                              Revoke
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </>
      )}

      <Modal opened={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a teammate" centered>
        <Stack>
          <TextInput
            label="Email"
            placeholder="teammate@company.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.currentTarget.value)}
          />
          <Select
            label="Role"
            data={ASSIGNABLE}
            value={inviteRole}
            allowDeselect={false}
            onChange={(v) => setInviteRole((v as 'admin' | 'editor') ?? 'editor')}
          />

          {lastLink && (
            <Alert variant="light" color="blue">
              <Text size="xs" mb={4}>
                Invite link — share it directly if email isn&apos;t set up:
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" ff="monospace" lineClamp={1} style={{ flex: 1 }}>
                  {lastLink}
                </Text>
                <CopyButton value={lastLink}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon variant="subtle" onClick={copy}>
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
            <Button onClick={sendInvite} loading={inviting} disabled={!inviteEmail.trim()}>
              Send invite
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        title={pendingRemove?.user.id === user?.id ? 'Leave workspace' : 'Remove member'}
        centered
      >
        <Stack>
          <Text size="sm">
            {pendingRemove?.user.id === user?.id ? (
              <>Leave this workspace? You&apos;ll lose access immediately.</>
            ) : (
              <>
                Remove <strong>{pendingRemove?.user.name ?? pendingRemove?.user.email}</strong> from this
                workspace?
              </>
            )}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingRemove(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={removeMember}>
              {pendingRemove?.user.id === user?.id ? 'Leave' : 'Remove'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
