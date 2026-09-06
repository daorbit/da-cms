import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Center,
  Group,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHistory, IconRestore } from '@tabler/icons-react';
import { ApiError } from '@/lib/api';
import {
  pageService,
  type PageRevision,
  type PageRevisionSummary,
} from '@/modules/content/pageService';

interface Props {
  opened: boolean;
  onClose: () => void;
  workspaceId: string;
  pageId: string;
  /** Reloads the editor once a revision has been restored. */
  onRestored: () => void;
}

/**
 * A page's history: what it looked like before each save.
 *
 * The list is on the left, the selected version's body on the right, so a
 * writer can read what they would be restoring rather than restoring to find
 * out. Restoring is itself snapshotted server-side, so it can be undone.
 */
export function RevisionHistoryModal({
  opened,
  onClose,
  workspaceId,
  pageId,
  onRestored,
}: Props) {
  const [items, setItems] = useState<PageRevisionSummary[]>([]);
  const [selected, setSelected] = useState<PageRevision | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOne, setLoadingOne] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pageService.revisions(workspaceId, pageId);
      setItems(res.items);
      // The newest is what someone almost always wants to look at first.
      if (res.items.length) setSelectedId(res.items[0].id);
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not load history',
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, pageId]);

  useEffect(() => {
    if (opened) void load();
  }, [opened, load]);

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    setLoadingOne(true);
    pageService
      .revision(workspaceId, pageId, selectedId)
      .then((r) => alive && setSelected(r))
      .catch(() => {})
      .finally(() => alive && setLoadingOne(false));
    return () => {
      alive = false;
    };
  }, [selectedId, workspaceId, pageId]);

  const restore = async () => {
    if (!selectedId) return;
    setRestoring(true);
    try {
      await pageService.restoreRevision(workspaceId, pageId, selectedId);
      notifications.show({ color: 'teal', message: 'Version restored' });
      onRestored();
      onClose();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not restore',
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8}>
          <IconHistory size={17} />
          <Text fw={600}>Version history</Text>
        </Group>
      }
      size="xl"
      centered
    >
      {loading ? (
        <Stack gap="xs">
          {Array.from({ length: 5 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Skeleton key={i} height={54} radius="sm" />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Center py={50}>
          <Stack align="center" gap="xs">
            <IconHistory size={26} stroke={1.4} opacity={0.4} />
            <Text fw={600} size="sm">
              No history yet
            </Text>
            <Text c="dimmed" size="sm">
              A version is kept each time this page is saved.
            </Text>
          </Stack>
        </Center>
      ) : (
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 15rem) minmax(0, 1fr)',
            gap: 'var(--mantine-spacing-md)',
          }}
        >
          <ScrollArea.Autosize mah="55vh">
            <Stack gap={6} pr="xs">
              {items.map((r, index) => (
                <UnstyledButton
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: '1px solid',
                    borderColor:
                      selectedId === r.id
                        ? 'var(--mantine-color-blue-5)'
                        : 'var(--mantine-color-default-border)',
                    background:
                      selectedId === r.id ? 'var(--mantine-color-blue-light)' : undefined,
                  }}
                >
                  <Group gap={6} wrap="nowrap" mb={2}>
                    <Text size="xs" fw={500}>
                      {new Date(r.createdAt).toLocaleString()}
                    </Text>
                    {index === 0 && (
                      <Badge size="xs" variant="light">
                        Latest
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {r.createdBy?.name ?? 'Unknown'} · {r.title}
                  </Text>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea.Autosize>

          <div>
            <ScrollArea.Autosize mah="55vh">
              {loadingOne ? (
                <Stack gap="xs">
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={12} />
                  <Skeleton height={12} width="85%" />
                </Stack>
              ) : selected ? (
                <Box pr="xs">
                  <Text fw={600}>{selected.title}</Text>
                  {selected.description && (
                    <Text size="sm" c="dimmed" mt={4}>
                      {selected.description}
                    </Text>
                  )}
                  {/* The body as it was. It is the editor's own output, whose
                      text is escaped and URLs sanitised on the way out. */}
                  <Box
                    mt="md"
                    style={{ fontSize: 13, opacity: 0.85 }}
                    dangerouslySetInnerHTML={{ __html: selected.content }}
                  />
                </Box>
              ) : null}
            </ScrollArea.Autosize>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button
                leftSection={<IconRestore size={15} />}
                loading={restoring}
                disabled={!selectedId}
                onClick={restore}
              >
                Restore this version
              </Button>
            </Group>
          </div>
        </Box>
      )}
    </Modal>
  );
}
