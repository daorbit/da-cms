import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from '@mantine/core';
import classes from './Shell.module.css';

interface Props {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  to: string;
  active: boolean;
}

/** One destination in the dock: an icon, its name in a tooltip, and on phones under it. */
export function DockItem({ label, icon: Icon, to, active }: Props) {
  return (
    <Tooltip label={label} position="right" withArrow openDelay={250} className={classes.tooltipDesktop}>
      <Link to={to} className={classes.item} data-active={active || undefined} aria-current={active ? 'page' : undefined}>
        <Icon size={20} stroke={active ? 2 : 1.6} />
        <span className={classes.itemLabel}>{label}</span>
      </Link>
    </Tooltip>
  );
}
