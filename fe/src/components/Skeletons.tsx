import { Card, Group, Skeleton, Stack } from '@mantine/core';

/**
 * Loading states shaped like the thing that is loading.
 *
 * A spinner says "something is happening"; a skeleton says what is about to
 * appear and holds its space, so the page does not jump when the data lands.
 * Each of these mirrors the layout it stands in for.
 */

/** A page's title block, which every screen opens with. */
export function HeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <Group justify="space-between" align="flex-end">
      <Stack gap={8}>
        <Skeleton height={26} width={160} radius="sm" />
        <Skeleton height={13} width={240} radius="sm" />
      </Stack>
      {withAction && <Skeleton height={36} width={120} radius="sm" />}
    </Group>
  );
}

/**
 * Tiles for the media wall.
 *
 * Heights vary because the wall is masonry — uniform tiles would set an
 * expectation the real content immediately breaks.
 */
export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  const heights = [180, 140, 220, 160, 200, 150];

  return (
    <div style={{ columnCount: 3, columnGap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{ breakInside: 'avoid', marginBottom: 12 }}
        >
          <Skeleton height={heights[i % heights.length]} radius="md" />
        </div>
      ))}
    </div>
  );
}

/** A stack of cards, for form-shaped screens. */
export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <Stack gap="md">
      {Array.from({ length: sections }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Card key={i} withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Skeleton height={14} width={120} radius="sm" />
            <Skeleton height={36} radius="sm" />
            <Group grow>
              <Skeleton height={36} radius="sm" />
              <Skeleton height={36} radius="sm" />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

/**
 * A whole route that has not resolved yet — a session check, an invite lookup.
 *
 * Deliberately vague: at this point the app does not yet know what it is about
 * to render, so a shape that suggested one would be a guess.
 */
export function PageSkeleton() {
  return (
    <Stack gap="lg" p="lg">
      <HeaderSkeleton />
      <Skeleton height={200} radius="md" />
      <Skeleton height={120} radius="md" />
    </Stack>
  );
}
