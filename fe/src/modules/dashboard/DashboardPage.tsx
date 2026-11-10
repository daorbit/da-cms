import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Skeleton, Text } from '@mantine/core';
import {
  IconArrowRight, IconChevronRight, IconFileText, IconPhoto, IconPlus, IconSettings, IconUsers,
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { PipelineMeter } from '@/components/PipelineMeter';
import { StatusLabel } from '@/components/StatusLabel';
import { dashboardService } from '@/modules/dashboard/dashboardService';
import type { DashboardStats, PageStatus } from '@/types';
import classes from './DashboardPage.module.css';

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

const TILES: { key: 'total' | PageStatus; label: string }[] = [
  { key: 'total', label: 'Total pages' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

export function DashboardPage() {
  const workspace = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    dashboardService
      .stats(workspace.id)
      .then((result) => !cancelled && setStats(result))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load your workspace'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const now = new Date();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const base = `/${workspace?.slug}`;
  const pagesHref = `${base}/content/pages`;
  const total = stats?.pages.total ?? 0;

  const actions = [
    { label: 'New page', hint: 'Start a draft', icon: IconPlus, onClick: () => navigate(`${pagesHref}?new=1`) },
    { label: 'Media library', hint: 'Upload and reuse images', icon: IconPhoto, onClick: () => navigate(`${base}/media`) },
    { label: 'Invite your team', hint: 'Write together', icon: IconUsers, onClick: () => navigate(`${base}/teams`) },
    { label: 'Workspace settings', hint: 'Groups, tags and links', icon: IconSettings, onClick: () => navigate(`${base}/settings`) },
  ];

  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <div>
          <p className={classes.date}>{today.format(now)}</p>
          <h1 className={classes.greeting}>
            {greeting(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate(`${pagesHref}?new=1`)}>
          New page
        </Button>
      </header>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <section className={classes.tiles} aria-label="Pages at a glance">
        {TILES.map((tile) => {
          const value = tile.key === 'total' ? total : stats?.pages[tile.key] ?? 0;
          return (
            <div key={tile.key} className={classes.tile} data-kind={tile.key}>
              <span className={classes.tileLabel}>
                {tile.key === 'total' ? <IconFileText size={15} stroke={1.7} /> : <StatusLabel status={tile.key} dotOnly />}
                {tile.label}
              </span>
              {loading ? (
                <Skeleton height={30} width={60} radius="sm" />
              ) : (
                <span className={classes.tileValue}>{value}</span>
              )}
              <span className={classes.tileHint}>
                {loading ? ' ' : tile.key === 'total' ? workspace?.name : `${percent(value, total)}% of pages`}
              </span>
            </div>
          );
        })}
      </section>

      <div className={classes.columns}>
        <section className={classes.card} aria-labelledby="recent-title">
          <div className={classes.cardHead}>
            <h2 id="recent-title" className={classes.cardTitle}>
              Recently edited
            </h2>
            <Link to={pagesHref} className={classes.cardLink}>
              All pages <IconArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className={classes.recent}>
              {Array.from({ length: 5 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <Skeleton key={i} height={48} radius={10} />
              ))}
            </div>
          ) : !stats || stats.recent.length === 0 ? (
            <div className={classes.empty}>
              <Text fw={600} size="sm">
                No pages yet
              </Text>
              <Text size="sm" c="dimmed">
                Pages you write, or ask Claude to draft, appear here.
              </Text>
            </div>
          ) : (
            <ul className={classes.recent}>
              {stats.recent.map((page) => {
                const image = page.thumbnailImage?.url || page.heroImage?.url;
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      className={classes.recentRow}
                      onClick={() => navigate(`${pagesHref}?page=${page.id}`)}
                    >
                      <span className={classes.recentThumb}>
                        {image ? <img src={image} alt="" loading="lazy" /> : <IconFileText size={16} stroke={1.5} />}
                      </span>
                      <span className={classes.recentMain}>
                        <span className={classes.recentTitle}>{page.title || 'Untitled'}</span>
                        <span className={classes.recentSlug}>/{page.slug}</span>
                      </span>
                      <span className={classes.recentStatus}>
                        <StatusLabel status={page.status} />
                      </span>
                      <span className={classes.recentGroup}>{page.group || '—'}</span>
                      <span className={classes.recentTime}>{relativeTime(page.updatedAt)}</span>
                      <IconChevronRight size={16} className={classes.recentChevron} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className={classes.side}>
          <section className={classes.card} aria-labelledby="pipeline-title">
            <h2 id="pipeline-title" className={classes.cardTitle}>
              Publishing
            </h2>
            {loading ? <Skeleton height={10} radius="xl" /> : stats && <PipelineMeter counts={stats.pages} />}
          </section>

          <section className={classes.card} aria-labelledby="actions-title">
            <h2 id="actions-title" className={classes.cardTitle}>
              Quick actions
            </h2>
            <div className={classes.actions}>
              {actions.map((action) => (
                <button key={action.label} type="button" className={classes.action} onClick={action.onClick}>
                  <span className={classes.actionIcon}>
                    <action.icon size={16} stroke={1.8} />
                  </span>
                  <span className={classes.actionText}>
                    <span className={classes.actionLabel}>{action.label}</span>
                    <span className={classes.actionHint}>{action.hint}</span>
                  </span>
                  <IconChevronRight size={15} className={classes.recentChevron} />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
