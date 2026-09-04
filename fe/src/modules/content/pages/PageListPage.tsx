import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Button, Card, Checkbox, Group, Menu, Pagination, Stack, Table, Text,
  TextInput, Tooltip, Title, SegmentedControl, Center, Loader, Modal, Select,
} from '@mantine/core';
import {
  IconPlus, IconSearch, IconEdit, IconTrash, IconFileText, IconEye, IconAdjustments,
  IconChevronDown,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { workspaceService } from '@/modules/workspace/workspaceService';
import { CreatePageModal } from '@/modules/content/pages/CreatePageModal';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { ApiError } from '@/lib/api';
import type { PageSummary, PageStatus } from '@/types';

type StatusFilter = 'all' | PageStatus;

const STATUS_COLOR: Record<PageStatus, string> = {
  draft: 'gray',
  published: 'teal',
  archived: 'orange',
};

const PER_PAGE = 20;

export function PageListPage() {
  const workspace = useWorkspace();
  const navigate = useNavigate();

  const [pages, setPages] = useState<PageSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [group, setGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PageSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState<PageSummary | null>(null);

  // Selection is by id so it survives a page's rows changing under it.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // `?new=1` lets other screens — the dashboard, onboarding — open the create
  // dialog without owning a copy of it.
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(params.get('new') === '1');

  const closeCreate = () => {
    setCreating(false);
    if (params.has('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  // Debounced so typing in the search box does not fire a request per keystroke.
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!workspace) return;
    workspaceService
      .settings(workspace.id)
      .then((s) => setGroups(s.configuration.groups.map((g) => g.name)))
      .catch(() => {});
  }, [workspace]);

  // Any filter change puts us back on page one.
  useEffect(() => {
    setPage(1);
  }, [status, group, query]);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const result = await pageService.list(workspace.id, {
        ...(status !== 'all' ? { status } : {}),
        ...(group ? { group } : {}),
        ...(query ? { q: query } : {}),
        page,
        perPage: PER_PAGE,
      });
      setPages(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      // A page can go out of range when the underlying set shrinks (a delete,
      // a tighter filter) — pull back to the last real page.
      if (result.page > result.totalPages) setPage(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load pages');
    } finally {
      setLoading(false);
    }
  }, [workspace, status, group, query, page]);

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

  const editHref = (p: PageSummary) => `/${workspace?.slug}/content/pages/${p.id}/edit`;
  const detailsHref = (p: PageSummary) => `/${workspace?.slug}/content/pages/${p.id}/details`;

  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const selectedOnPage = pageIds.filter((id) => selected.has(id));
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const runBulkStatus = async (next: PageStatus) => {
    if (!workspace || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const { updated } = await pageService.bulkStatus(workspace.id, [...selected], next);
      notifications.show({ message: `${updated} page${updated === 1 ? '' : 's'} → ${next}`, color: 'teal' });
      clearSelection();
      await load();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Bulk update failed',
        color: 'red',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkDelete = async () => {
    if (!workspace || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const { deleted } = await pageService.bulkDelete(workspace.id, [...selected]);
      notifications.show({ message: `${deleted} page${deleted === 1 ? '' : 's'} deleted`, color: 'teal' });
      clearSelection();
      setBulkDeleteOpen(false);
      await load();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Bulk delete failed',
        color: 'red',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, total);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Pages</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Every page in this workspace.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
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
          placeholder="Search by name or slug"
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        {groups.length > 0 && (
          <Select
            placeholder="All groups"
            clearable
            value={group}
            onChange={setGroup}
            data={groups}
            w={160}
          />
        )}
        <SegmentedControl
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Archived', value: 'archived' },
          ]}
        />
      </Group>

      {selected.size > 0 && (
        <Card withBorder radius="md" py="xs" px="md" bg="var(--mantine-color-blue-light)">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {selected.size} selected
            </Text>
            <Group gap="xs">
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <Button
                    size="xs"
                    variant="default"
                    rightSection={<IconChevronDown size={14} />}
                    loading={bulkBusy}
                  >
                    Set status
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => runBulkStatus('draft')}>Draft</Menu.Item>
                  <Menu.Item onClick={() => runBulkStatus('published')}>Published</Menu.Item>
                  <Menu.Item onClick={() => runBulkStatus('archived')}>Archived</Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Button
                size="xs"
                color="red"
                variant="light"
                leftSection={<IconTrash size={14} />}
                loading={bulkBusy}
                onClick={() => setBulkDeleteOpen(true)}
              >
                Delete
              </Button>
              <Button size="xs" variant="subtle" color="gray" onClick={clearSelection}>
                Clear
              </Button>
            </Group>
          </Group>
        </Card>
      )}

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
                {query || status !== 'all' || group
                  ? 'Nothing matches that filter.'
                  : 'Create your first page to get started.'}
              </Text>
              {!query && status === 'all' && !group && (
                <Button
                  size="xs"
                  variant="light"
                  mt="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setCreating(true)}
                >
                  New page
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected}
                    onChange={toggleAllOnPage}
                  />
                </Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Slug</Table.Th>
                <Table.Th>Group</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th>Updated by</Table.Th>
                <Table.Th w={168} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pages.map((p) => (
                <Table.Tr key={p.id} bg={selected.has(p.id) ? 'var(--mantine-color-blue-light)' : undefined}>
                  <Table.Td>
                    <Checkbox
                      aria-label={`Select ${p.title}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text component={Link} to={editHref(p)} fw={500} c="inherit" td="none">
                      {p.title}
                    </Text>
                    {p.description && (
                      <Text c="dimmed" size="xs" lineClamp={1}>
                        {p.description}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed" size="sm" ff="monospace">
                      /{p.slug}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.group}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light" color={STATUS_COLOR[p.status]}>
                      {p.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed" size="sm">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed" size="sm">
                      {p.updatedBy?.name ?? '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Edit" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label="Edit"
                          onClick={() => navigate(editHref(p))}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Preview" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label="Preview"
                          onClick={() => setPreviewing(p)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Details" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label="Details"
                          onClick={() => navigate(detailsHref(p))}
                        >
                          <IconAdjustments size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="Delete"
                          onClick={() => setPendingDelete(p)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {!loading && pages.length > 0 && (
        <Group justify="space-between">
          <Text c="dimmed" size="sm">
            {rangeStart}–{rangeEnd} of {total}
          </Text>
          {totalPages > 1 && (
            <Pagination value={page} onChange={setPage} total={totalPages} size="sm" withEdges />
          )}
        </Group>
      )}

      <CreatePageModal
        opened={creating}
        onClose={closeCreate}
        onCreated={(created) => {
          closeCreate();
          navigate(`/${workspace?.slug}/content/pages/${created.id}/edit`);
        }}
      />

      {previewing && workspace && (
        <ContentPreviewModal
          opened
          onClose={() => setPreviewing(null)}
          title={previewing.title}
          src={pageService.previewUrl(workspace.id, previewing.id)}
        />
      )}

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

      <Modal
        opened={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Delete pages"
        centered
      >
        <Stack>
          <Text size="sm">
            Delete <strong>{selected.size}</strong> page{selected.size === 1 ? '' : 's'}? This cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button color="red" loading={bulkBusy} onClick={runBulkDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
