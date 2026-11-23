import classes from './MediaGrid.module.css';

/** Widest column count. Fewer columns means bigger tiles. */
export type GridColumns = 3 | 4;

export function gridClass(maxColumns: GridColumns) {
  return maxColumns === 4 ? `${classes.grid} ${classes.fourUp}` : classes.grid;
}
