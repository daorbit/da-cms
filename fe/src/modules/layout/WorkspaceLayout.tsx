import { Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFileText, IconHome2, IconPhoto, IconSettings, IconUsers } from '@tabler/icons-react';
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

export function WorkspaceLayout() {
  const { workspaceSlug } = useParams();
  const { pathname } = useLocation();
  const { workspaces } = useAuth();
  const [claudeOpened, claude] = useDisclosure(false);

  const workspace = workspaces.find((w) => w.slug === workspaceSlug);
  const flush = FLUSH_ROUTES.some((route) => route.test(pathname));

  return (
    <div className={classes.shell}>
      <nav className={classes.dock} aria-label="Main">
        <div className={classes.dockTop}>
          <WorkspaceMenu workspace={workspace} workspaces={workspaces} />
        </div>

        <div className={classes.dockNav}>
          {NAV.map((item) => (
            <DockItem
              key={item.to}
              label={item.label}
              icon={item.icon}
              to={`/${workspaceSlug}/${item.to}`}
              // Prefix rather than equality, so the editor keeps Pages lit.
              active={pathname.startsWith(`/${workspaceSlug}/${item.to}`)}
            />
          ))}
        </div>

        <div className={classes.dockBottom}>
          <Tooltip label="Connect Claude" position="right" withArrow openDelay={250}>
            <UnstyledButton
              className={`${classes.item} ${classes.desktopOnly}`}
              aria-label="Connect Claude"
              data-active={claudeOpened || undefined}
              onClick={claude.open}
            >
              <ClaudeIcon size={19} />
            </UnstyledButton>
          </Tooltip>
          <AccountMenu onConnectClaude={claude.open} />
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
