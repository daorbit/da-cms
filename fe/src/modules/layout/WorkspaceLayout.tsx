import { AppShell, Group, Text, Button, Menu, Avatar, NavLink, Stack, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLogout, IconChevronDown, IconLayoutDashboard, IconFileText, IconStack2,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const NAV = [
  { label: 'Dashboard', to: 'dashboard', icon: IconLayoutDashboard },
  { label: 'Pages', to: 'content/pages', icon: IconFileText },
  { label: 'Collections', to: 'content/collections', icon: IconStack2 },
];

export function WorkspaceLayout() {
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, clearSession } = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    clearSession();
    navigate('/login');
  };

  const go = (to: string) => {
    navigate(`/${workspaceSlug}/${to}`);
    close();
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text
              fw={600}
              onClick={() => go('dashboard')}
              style={{ cursor: 'pointer' }}
            >
              da-cms
            </Text>
          </Group>

          <Menu shadow="md" width={180} position="bottom-end">
            <Menu.Target>
              <Button variant="subtle" color="gray" rightSection={<IconChevronDown size={14} />}>
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

      <AppShell.Navbar p="sm">
        <Stack gap={2}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              label={item.label}
              leftSection={<item.icon size={18} stroke={1.6} />}
              // Prefix rather than equality, so an editor route keeps its parent
              // nav item highlighted instead of clearing the whole sidebar.
              active={pathname.startsWith(`/${workspaceSlug}/${item.to}`)}
              onClick={() => go(item.to)}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
