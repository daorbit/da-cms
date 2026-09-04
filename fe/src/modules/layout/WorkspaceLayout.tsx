import { AppShell, Group, Text, Menu, Avatar, NavLink, Stack, Burger, UnstyledButton, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLogout, IconSelector, IconLayoutDashboard, IconFileText, IconCheck, IconSettings, IconPlus,
  IconUsers,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { label: 'Dashboard', to: 'dashboard', icon: IconLayoutDashboard },
  { label: 'Pages', to: 'content/pages', icon: IconFileText },
  { label: 'Teams', to: 'teams', icon: IconUsers },
  { label: 'Settings', to: 'settings', icon: IconSettings },
];

export function WorkspaceLayout() {
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, workspaces, clearSession } = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);

  const workspace = workspaces.find((w) => w.slug === workspaceSlug);

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
      // No header: the brand, the workspace switcher and the account menu all
      // live in the sidebar, which leaves the content area starting at the top
      // of the window instead of under a bar that held three things.
      header={{ height: 52, collapsed: true }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="xl"
    >
      <AppShell.Navbar p="sm" className="app-nav">
        <Stack gap="xs" h="100%">
          {/* Workspace switcher, doubling as the brand mark. */}
          <Menu shadow="md" width={220} position="bottom-start">
            <Menu.Target>
              <UnstyledButton className="ws-switcher">
                <Group gap="sm" wrap="nowrap">
                  <span className="ws-switcher-text">
                    <Text size="md" fw={600} truncate>
                      {workspace?.name ?? 'da-cms'}
                    </Text>
                  </span>
                  <IconSelector size={15} stroke={1.7} opacity={0.5} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Workspaces</Menu.Label>
              {workspaces.map((item) => (
                <Menu.Item
                  key={item.id}
                  leftSection={
                    item.slug === workspaceSlug ? <IconCheck size={14} /> : <span style={{ width: 14 }} />
                  }
                  onClick={() => navigate(`/${item.slug}/dashboard`)}
                >
                  {item.name}
                </Menu.Item>
              ))}
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconPlus size={14} />}
                onClick={() => navigate('/workspaces')}
              >
                Manage workspaces
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Divider className="nav-rule" />

          <Stack gap={2}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                label={item.label}
                leftSection={<item.icon size={18} stroke={1.6} />}
                // Prefix rather than equality, so an editor route keeps its
                // parent nav item highlighted instead of clearing the sidebar.
                active={pathname.startsWith(`/${workspaceSlug}/${item.to}`)}
                onClick={() => go(item.to)}
              />
            ))}
          </Stack>

          {/* Pushed to the bottom: theme and account are settings, not
              navigation, and sitting them under the links made them read as a
              fourth and fifth destination. */}
          <Stack gap="xs" mt="auto">
            <ThemeToggle />
            <Divider className="nav-rule" />

            <Menu shadow="md" width={200} position="top-start">
              <Menu.Target>
                <UnstyledButton className="ws-account">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar size={28} radius="xl" color="brand">
                      {user?.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <span className="ws-switcher-text">
                      <Text size="sm" fw={500} truncate>
                        {user?.name}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {user?.email}
                      </Text>
                    </span>
                    <IconSelector size={15} stroke={1.7} opacity={0.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* The only thing left of the header: without it there is no way to
            open the sidebar on a phone. */}
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" mb="md" />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
