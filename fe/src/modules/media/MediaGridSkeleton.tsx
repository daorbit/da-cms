import { Skeleton } from '@mantine/core';
import { MEDIA_PER_PAGE } from './useMediaLibrary';
import { gridClass, type GridColumns } from './mediaGridClass';
import classes from './MediaGrid.module.css';

export function MediaGridSkeleton({ maxColumns = 4 }: { maxColumns?: GridColumns }) {
  return (
    <div className={gridClass(maxColumns)}>
      {Array.from({ length: MEDIA_PER_PAGE }, (_, i) => (
        <div key={i} className={classes.placeholder}>
          <Skeleton className={classes.preview} radius={0} />
          <div className={classes.meta}>
            <Skeleton height={12} width="70%" my={3} radius="sm" />
            <Skeleton height={10} width="40%" my={3} radius="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
