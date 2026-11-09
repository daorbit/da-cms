import type { PageStatus } from '@/types';
import classes from './StatusLabel.module.css';

export const STATUS_LABEL: Record<PageStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export const STATUS_ORDER: PageStatus[] = ['published', 'draft', 'archived'];

interface Props {
  status: PageStatus;
  /** Dot only, with the label kept for screen readers and the tooltip. */
  dotOnly?: boolean;
}

/**
 * A page's publishing state: a shaped dot plus its name. The shape differs per
 * state (filled, ring, dashed ring), so it never relies on colour alone.
 */
export function StatusLabel({ status, dotOnly = false }: Props) {
  return (
    <span className={classes.root} data-status={status} title={dotOnly ? STATUS_LABEL[status] : undefined}>
      <span className={classes.dot} aria-hidden="true" />
      <span className={dotOnly ? classes.hidden : classes.label}>{STATUS_LABEL[status]}</span>
    </span>
  );
}
