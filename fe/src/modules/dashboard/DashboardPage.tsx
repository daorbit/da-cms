import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Skeleton, Text } from '@mantine/core';
import { IconArrowRight, IconPlus } from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { plural } from '@/lib/format';
import { PipelineMeter } from '@/components/PipelineMeter';
import { PageRow } from '@/modules/content/pages/library/PageRow';
import { dashboardService } from '@/modules/dashboard/dashboardService';
import type { DashboardStats } from '@/types';
import classes from './DashboardPage.module.css';

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function headline(stats: DashboardStats | null) {
  if (!stats || stats.pages.total === 0) return 'Nothing published yet';
  const { published, total } = stats.pages;
  return published === total ? `All ${plural(total, 'page')} are live` : `${published} of ${plural(total, 'page')} live`;
}

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
  const pagesHref = `/${workspace?.slug}/content/pages`;

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

      <section className={classes.card} aria-labelledby="pipeline-title">
        <div className={classes.cardHead}>
          <div>
            <Text size="sm" c="dimmed">
              {workspace?.name}
            </Text>
            {loading ? (
              <Skeleton height={26} width={220} radius="sm" mt={6} />
            ) : (
              <h2 id="pipeline-title" className={classes.headline}>
                {headline(stats)}
              </h2>
            )}
          </div>
        </div>
        {loading ? (
          <Skeleton height={10} radius="xl" />
        ) : (
          stats && <PipelineMeter counts={stats.pages} />
        )}
      </section>

      <section className={classes.card} aria-labelledby="recent-title">
        <div className={classes.sectionHead}>
          <h2 id="recent-title" className={classes.sectionTitle}>
            Recently edited
          </h2>
          <Link to={pagesHref} className={classes.sectionLink}>
            All pages <IconArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className={classes.recent}>
            {Array.from({ length: 4 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} height={52} radius={12} />
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
          <div className={classes.recent}>
            {stats.recent.map((page) => (
              <PageRow key={page.id} page={page} onOpen={() => navigate(`${pagesHref}?page=${page.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
