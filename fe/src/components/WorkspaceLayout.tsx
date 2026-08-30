import { AppShell, Group, Text, Button, Menu, Avatar } from '@mantine/core';
import { IconLogout, IconChevronDown } from '@tabler/icons-react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function WorkspaceLayout() {
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const { user, clearSession } = useAuth();

  const handleLogout = async () => {
    await api.post('/auth/logout');
    clearSession();
    navigate('/login');
  };

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={600} onClick={() => navigate(`/${workspaceSlug}/collections`)} style={{ cursor: 'pointer' }}>
            da-cms
          </Text>
          <Menu shadow="md" width={180}>
            <Menu.Target>
              <Button variant="subtle" rightSection={<IconChevronDown size={14} />}>
                <Group gap="xs">
                  <Avatar size="sm" radius="xl">
                    {user?.name?.[0]?.toUpperCase()}
                  </Avatar>
                  {user?.name}
                </Group>
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
