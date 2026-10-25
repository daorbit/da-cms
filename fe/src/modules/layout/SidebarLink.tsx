import type { ComponentType } from 'react';
import { NavLink, Tooltip } from '@mantine/core';

interface SidebarLinkProps {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

export function SidebarLink({ label, icon: ItemIcon, active, collapsed, onClick }: SidebarLinkProps) {
  return (
    <Tooltip label={label} position="right" withArrow disabled={!collapsed}>
      <NavLink
        label={collapsed ? undefined : label}
        aria-label={label}
        leftSection={<ItemIcon size={18} stroke={1.6} />}
        active={active}
        onClick={onClick}
      />
    </Tooltip>
  );
}
