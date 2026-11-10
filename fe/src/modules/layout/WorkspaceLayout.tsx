import { useEffect, useState } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText, IconHome2, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconPhoto, IconSettings, IconUsers,
} from '@tabler/icons-react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ClaudeIcon } from '@/components/ClaudeIcon';
import { ConnectClaudeModal } from '@/modules/integrations/ConnectClaudeModal';
import { AccountMenu } from './AccountMenu';
import { DockItem } from './DockItem';
import { WorkspaceMenu } from './WorkspaceMenu';
import classes from './Shell.module.css';

const NAV = [
  { label: 'Home', to: 'dashboard', icon: IconHome2 },
  { label: 'Pages', to: 'content/pages', icon: IconFileText },
  { label: 'Media', to: 'media', icon: IconPhoto },
  { label: 'Team', to: 'teams', icon: IconUsers },
  { label: 'Settings', to: 'settings', icon: IconSettings },
];

/** Routes that are working surfaces: they fill the panel edge to edge and scroll themselves. */
const FLUSH_ROUTES = [/\/content\/pages\/?$/, /\/content\/pages\/[^/]+\/edit$/];

const COLLAPSED_KEY = 'da-cms:sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function WorkspaceLayout() {
  const { workspaceSlug } = useParams();
  const { pathname } = useLocation();
  const { workspaces } = useAuth();
  const [claudeOpened, claude] = useDisclosure(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }, [collapsed]);

  const workspace = workspaces.find((w) => w.slug === workspaceSlug);
  const flush = FLUSH_ROUTES.some((route) => route.test(pathname));

  return (
    <div className={classes.shell} data-collapsed={collapsed || undefined}>
      <nav className={classes.sidebar} aria-label="Main">
        <div className={classes.sidebarTop}>
          <WorkspaceMenu workspace={workspace} workspaces={workspaces} collapsed={collapsed} />
        </div>

        <div className={classes.nav}>
          {NAV.map((item) => (
            <DockItem
              key={item.to}
              label={item.label}
              icon={item.icon}
              to={`/${workspaceSlug}/${item.to}`}
              collapsed={collapsed}
              // Prefix rather than equality, so the editor keeps Pages lit.
              active={pathname.startsWith(`/${workspaceSlug}/${item.to}`)}
            />
          ))}
        </div>

        <div className={classes.sidebarBottom}>
          <Tooltip label="Connect Claude" position="right" withArrow openDelay={250} disabled={!collapsed}>
            <UnstyledButton
              className={`${classes.item} ${classes.desktopOnly}`}
              aria-label="Connect Claude"
              data-active={claudeOpened || undefined}
              onClick={claude.open}
            >
              <span className={classes.itemIcon}>
                <ClaudeIcon size={17} />
              </span>
              <span className={classes.itemLabel}>Connect Claude</span>
            </UnstyledButton>
          </Tooltip>

          <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right" withArrow openDelay={250} disabled={!collapsed}>
            <UnstyledButton
              className={`${classes.item} ${classes.desktopOnly}`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((value) => !value)}
            >
              <span className={classes.itemIcon}>
                {collapsed ? <IconLayoutSidebarLeftExpand size={18} stroke={1.6} /> : <IconLayoutSidebarLeftCollapse size={18} stroke={1.6} />}
              </span>
              <span className={classes.itemLabel}>Collapse</span>
            </UnstyledButton>
          </Tooltip>

          <div className={classes.sidebarDivider} />
          <AccountMenu onConnectClaude={claude.open} collapsed={collapsed} />
        </div>
      </nav>

      <main className={classes.main} data-flush={flush || undefined}>
        <div className={classes.outlet}>
          <Outlet />
        </div>
      </main>

      <ConnectClaudeModal opened={claudeOpened} onClose={claude.close} />
    </div>
  );
}
