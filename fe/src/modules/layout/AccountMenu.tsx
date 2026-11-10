import { Avatar, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconLogout, IconSwitchHorizontal } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ClaudeIcon } from '@/components/ClaudeIcon';
import { ThemeMenuItems } from './ThemeToggle';
import classes from './Shell.module.css';

interface Props {
  onConnectClaude: () => void;
  collapsed?: boolean;
}

/** The signed-in person: who they are, appearance, and signing out. */
export function AccountMenu({ onConnectClaude, collapsed }: Props) {
  const navigate = useNavigate();
  const { user, clearSession } = useAuth();

  const logout = async () => {
    await api.post('/auth/logout');
    clearSession();
    navigate('/login');
  };

  return (
    <Menu position={collapsed ? 'right-end' : 'top-start'} offset={8} width={240} withinPortal>
      <Menu.Target>
        <UnstyledButton className={classes.account} aria-label="Account">
          <Avatar size={28} radius="xl" color="brand" variant="filled">
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <span className={classes.accountText}>
            <span className={classes.accountName}>{user?.name}</span>
            <span className={classes.accountEmail}>{user?.email}</span>
          </span>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <div className={classes.accountHeader}>
          <Text size="sm" fw={600} truncate>
            {user?.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {user?.email}
          </Text>
        </div>
        <Menu.Divider />
        <Menu.Item
          className={classes.mobileOnly}
          leftSection={<IconSwitchHorizontal size={15} stroke={1.7} />}
          onClick={() => navigate('/workspaces')}
        >
          Switch workspace
        </Menu.Item>
        <Menu.Item className={classes.mobileOnly} leftSection={<ClaudeIcon size={15} />} onClick={onConnectClaude}>
          Connect Claude
        </Menu.Item>
        <ThemeMenuItems />
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={15} stroke={1.7} />} onClick={logout}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
