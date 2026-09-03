import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Button, Card, Group, Menu, Stack, Table, Text, TextInput,
  Title, SegmentedControl, Center, Loader, Modal,
} from '@mantine/core';
import {
  IconPlus, IconSearch, IconDots, IconEdit, IconTrash, IconFileText,
} from '@tabler/icons-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { ApiError } from '@/lib/api';
import type { Page } from '@/types';

type StatusFilter = 'all' | 'draft' | 'published';

export function PageListPage() {
  const workspace = useWorkspace();
  const navigate = useNavigate();

  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced so typing in the search box does not fire a request per keystroke.
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const result = await pageService.list(workspace.id, {
        ...(status !== 'all' ? { status } : {}),
        ...(query ? { q: query } : {}),
      });
      setPages(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load pages');
    } finally {
      setLoading(false);
    }
  }, [workspace, status, query]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!workspace || !pendingDelete) return;
    setDeleting(true);
    try {
      await pageService.destroy(workspace.id, pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the page');
    } finally {
      setDeleting(false);
    }
  };

  const editHref = (page: Page) => `/${workspace?.slug}/content/pages/${page.id}/edit`;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Pages</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Every page in this workspace.
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

      <Group>
        <TextInput
          placeholder="Search pages"
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <SegmentedControl
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ]}
        />
      </Group>

      <Card withBorder radius="md" p={0}>
        {loading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : pages.length === 0 ? (
          <Center py={64}>
            <Stack align="center" gap="xs">
              <IconFileText size={32} opacity={0.4} />
              <Text fw={600}>No pages yet</Text>
              <Text c="dimmed" size="sm">
                {query || status !== 'all'
                  ? 'Nothing matches that filter.'
                  : 'Create your first page to get started.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Slug</Table.Th>
                <Table.Th>Sections</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th w={50} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pages.map((page) => (
                <Table.Tr key={page.id}>
                  <Table.Td>
                    <Text component={Link} to={editHref(page)} fw={500} c="inherit" td="none">
                      {page.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed" size="sm" ff="monospace">
                      /{page.slug}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{page.sections.length}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={page.status === 'published' ? 'teal' : 'gray'}
                    >
                      {page.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed" size="sm">
                      {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu shadow="md" width={160} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => navigate(editHref(page))}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => setPendingDelete(page)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete page"
        centered
      >
        <Stack>
          <Text size="sm">
            Delete <strong>{pendingDelete?.title}</strong>? This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
