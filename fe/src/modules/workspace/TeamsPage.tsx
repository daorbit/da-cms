import { Stack, Text, Title } from '@mantine/core';
import { useWorkspace } from '@/hooks/useWorkspace';
import { MembersTab } from './settings/MembersTab';

/**
 * Team roster on its own sidebar destination. The table, invites and role
 * management are the same as Settings > Members — this just gives them a
 * top-level home instead of being buried a tab deep.
 */
export function TeamsPage() {
  const workspace = useWorkspace();
  if (!workspace) return null;

  const canManage = workspace.role === 'owner' || workspace.role === 'admin';

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Team</Title>
        <Text c="dimmed" size="sm" mt={4}>
          People with access to this workspace, their roles, and pending invites.
        </Text>
      </div>

      <MembersTab workspace={workspace} canManage={canManage} />
    </Stack>
  );
}
