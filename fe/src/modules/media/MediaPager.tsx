import { Group, Pagination, Text } from '@mantine/core';
import { MEDIA_PER_PAGE } from './useMediaLibrary';

interface Props {
  page: number;
  total: number;
  onChange: (page: number) => void;
}

export function MediaPager({ page, total, onChange }: Props) {
  const pageCount = Math.ceil(total / MEDIA_PER_PAGE);
  if (pageCount <= 1) return null;

  return (
    <Group justify="space-between">
      <Text size="xs" c="dimmed">
        {(page - 1) * MEDIA_PER_PAGE + 1}–{Math.min(page * MEDIA_PER_PAGE, total)} of {total}
      </Text>
      <Pagination
        size="sm"
        value={page}
        onChange={onChange}
        total={pageCount}
        withEdges={pageCount > 5}
      />
    </Group>
  );
}
