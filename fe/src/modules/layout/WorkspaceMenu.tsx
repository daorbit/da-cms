import { Menu, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconSelector, IconSettings2 } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { Workspace } from '@/types';
import classes from './Shell.module.css';

interface Props {
  workspace: Workspace | undefined;
  workspaces: Workspace[];
  collapsed?: boolean;
}

const monogram = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'D';

/** The current workspace, named, which is also how you switch between workspaces. */
export function WorkspaceMenu({ workspace, workspaces, collapsed }: Props) {
  const navigate = useNavigate();
  const name = workspace?.name ?? 'da-cms';

  return (
    <Menu position="bottom-start" offset={6} width={240} withinPortal>
      <Menu.Target>
        <Tooltip label={name} position="right" withArrow openDelay={250} disabled={!collapsed}>
          <UnstyledButton className={classes.workspace} aria-label={`Workspace: ${name}. Switch workspace`}>
            <span className={classes.monogram}>{monogram(name)}</span>
            <span className={classes.workspaceText}>
              <span className={classes.workspaceName}>{name}</span>
              <span className={classes.workspaceHint}>Workspace</span>
            </span>
            <IconSelector size={15} stroke={1.7} className={classes.workspaceChevron} />
          </UnstyledButton>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Workspaces</Menu.Label>
        {workspaces.map((item) => (
          <Menu.Item
            key={item.id}
            leftSection={<span className={classes.menuMonogram}>{monogram(item.name)}</span>}
            rightSection={item.slug === workspace?.slug ? <IconCheck size={14} /> : null}
            onClick={() => navigate(`/${item.slug}/dashboard`)}
          >
            {item.name}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconSettings2 size={15} stroke={1.7} />}
          onClick={() => navigate(`/${workspace?.slug}/workspaces`)}
        >
          Manage workspaces
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
