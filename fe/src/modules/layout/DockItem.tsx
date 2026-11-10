import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from '@mantine/core';
import classes from './Shell.module.css';

interface Props {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  to: string;
  active: boolean;
  /** Icon-only sidebar: the label moves into a tooltip. */
  collapsed?: boolean;
}

/** One destination in the sidebar: an icon and its name. */
export function DockItem({ label, icon: Icon, to, active, collapsed }: Props) {
  return (
    <Tooltip label={label} position="right" withArrow openDelay={250} disabled={!collapsed}>
      <Link to={to} className={classes.item} data-active={active || undefined} aria-current={active ? 'page' : undefined}>
        <span className={classes.itemIcon}>
          <Icon size={18} stroke={active ? 2 : 1.6} />
        </span>
        <span className={classes.itemLabel}>{label}</span>
      </Link>
    </Tooltip>
  );
}
