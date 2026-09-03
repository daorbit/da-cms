import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, Center, Grid, Group, Loader, Stack, Table, Text, Title, ThemeIcon,
} from '@mantine/core';
import { IconFileText, IconPencil, IconWorld, IconPlus, IconArrowRight } from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { dashboardService } from '@/modules/dashboard/dashboardService';
import { ApiError } from '@/lib/api';
import type { DashboardStats, PageStatus } from '@/types';

const TILES = [
  { key: 'total', label: 'Total pages', icon: IconFileText, color: 'blue' },
  { key: 'draft', label: 'Drafts', icon: IconPencil, color: 'gray' },
  { key: 'published', label: 'Published', icon: IconWorld, color: 'teal' },
] as const;

const STATUS_COLOR: Record<PageStatus, string> = {
  draft: 'gray',
  published: 'teal',
  archived: 'orange',
};

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

    (async () => {
      try {
        const result = await dashboardService.stats(workspace.id);
        if (!cancelled) setStats(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load the dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspace]);

  // Only the first name — the greeting reads oddly with a full "Jane Doe".
  const firstName = user?.name?.split(' ')[0] ?? '';

  if (loading) {
    return (
      <Center py={80}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Welcome back{firstName ? `, ${firstName}` : ''}</Title>
          <Text c="dimmed" size="sm" mt={4}>
            What's happening in {workspace?.name}.
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate(`/${workspace?.slug}/content/pages/new`)}
        >
          New page
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Grid gutter="md">
        {TILES.map((tile) => (
          <Grid.Col key={tile.key} span={{ base: 12, xs: 4 }}>
            <Card withBorder radius="md" p="lg">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    {tile.label}
                  </Text>
                  <Text fw={700} fz={32} lh={1.1} mt={6}>
                    {stats?.pages[tile.key] ?? 0}
                  </Text>
                </div>
                <ThemeIcon variant="light" color={tile.color} size="lg" radius="md">
                  <tile.icon size={18} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Card withBorder radius="md" p={0}>
        <Group justify="space-between" p="md" pb="sm">
          <Title order={5}>Recently updated</Title>
          <Button
            variant="subtle"
            size="xs"
            rightSection={<IconArrowRight size={14} />}
            onClick={() => navigate(`/${workspace?.slug}/content/pages`)}
          >
            All pages
          </Button>
        </Group>

        {!stats || stats.recent.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap={4}>
              <IconFileText size={28} opacity={0.4} />
              <Text fw={600} size="sm">
                Nothing here yet
              </Text>
              <Text c="dimmed" size="sm">
                Pages you create will show up here.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Updated</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.recent.map((page) => (
                <Table.Tr
                  key={page.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/${workspace?.slug}/content/pages/${page.id}/edit`)}
                >
                  <Table.Td>
                    <Text fw={500} size="sm">
                      {page.title}
                    </Text>
                    <Text c="dimmed" size="xs" ff="monospace">
                      /{page.slug}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light" color={STATUS_COLOR[page.status]}>
                      {page.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed" size="sm">
                      {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
