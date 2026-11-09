import { STATUS_ORDER, StatusLabel } from '@/components/StatusLabel';
import type { PageStatus } from '@/types';
import classes from './PipelineMeter.module.css';

interface Props {
  counts: Record<PageStatus, number>;
}

/** How a workspace's pages split across publishing states, as one proportional bar. */
export function PipelineMeter({ counts }: Props) {
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className={classes.root}>
      <div
        className={classes.bar}
        role="img"
        aria-label={STATUS_ORDER.map((status) => `${counts[status]} ${status}`).join(', ')}
      >
        {total === 0 ? (
          <span className={classes.empty} />
        ) : (
          STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
            <span
              key={status}
              className={classes.segment}
              data-status={status}
              style={{ flexGrow: counts[status] }}
            />
          ))
        )}
      </div>

      <ul className={classes.legend}>
        {STATUS_ORDER.map((status) => (
          <li key={status} className={classes.legendItem}>
            <StatusLabel status={status} />
            <span className={classes.count}>{counts[status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
