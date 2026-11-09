import { Checkbox } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';
import { StatusLabel } from '@/components/StatusLabel';
import { relativeTime } from '@/lib/format';
import type { PageSummary } from '@/types';
import classes from './PageLibrary.module.css';

interface Props {
  page: PageSummary;
  active?: boolean;
  checked?: boolean;
  /** Shows the checkbox on every row rather than only on hover. */
  selecting?: boolean;
  onOpen: () => void;
  onToggleChecked?: () => void;
}

/** One page in a list: its card image, title, and where it stands. */
export function PageRow({ page, active, checked, selecting, onOpen, onToggleChecked }: Props) {
  const image = page.thumbnailImage?.url || page.heroImage?.url;

  return (
    <div
      className={classes.row}
      data-active={active || undefined}
      data-checked={checked || undefined}
      data-selecting={selecting || undefined}
    >
      {onToggleChecked && (
        <Checkbox
          size="xs"
          radius="sm"
          className={classes.rowCheck}
          aria-label={`Select ${page.title}`}
          checked={!!checked}
          onChange={onToggleChecked}
        />
      )}

      <button type="button" className={classes.rowButton} onClick={onOpen} aria-current={active || undefined}>
        <span className={classes.thumb}>
          {image ? <img src={image} alt="" loading="lazy" /> : <IconFileText size={18} stroke={1.5} />}
        </span>

        <span className={classes.rowText}>
          <span className={classes.rowTitle}>{page.title || 'Untitled'}</span>
          <span className={classes.rowMeta}>
            <StatusLabel status={page.status} />
            <span className={classes.metaSep} aria-hidden="true" />
            <span>{relativeTime(page.updatedAt)}</span>
            {page.group && (
              <>
                <span className={classes.metaSep} aria-hidden="true" />
                <span className={classes.rowGroup}>{page.group}</span>
              </>
            )}
          </span>
        </span>
      </button>
    </div>
  );
}
