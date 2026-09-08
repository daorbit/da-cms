import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Modal,
  Pagination,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconSearch,
  IconTrash,
  IconPencil,
  IconRefresh,
  IconPhotoOff,
  IconEye,
  IconChecklist,
} from '@tabler/icons-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { mediaService, type MediaAsset, type MediaKind } from './mediaService';
import { MediaGrid, TileAction } from './MediaGrid';
import { UploadTray, type UploadItem } from './UploadTray';
import { MediaPreviewModal } from './MediaPreviewModal';
import { MediaGridSkeleton } from '@/components/Skeletons';

type Filter = 'all' | MediaKind;

const PER_PAGE = 12;

 
export function MediaPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace?.id;

  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploading = uploads.some((u) => u.state === 'queued' || u.state === 'uploading');
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<MediaAsset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState<MediaAsset | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await mediaService.list(workspaceId, {
        kind: filter === 'all' ? undefined : filter,
        q: query,
        page,
        perPage: PER_PAGE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the library');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filter, query, page]);

  // Debounced so typing in the search box is not a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  // A narrowed result set is shorter, so the page a user was on may no longer
  // exist — start again from the first rather than showing an empty wall.
  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length || !workspaceId) return;

    const files = Array.from(fileList);
    setError(null);
    setUploads(files.map((file) => ({ file, state: 'queued' })));

    const { assets, failed } = await mediaService.uploadMany(
      workspaceId,
      files,
      (index, state, _asset, err) => {
        setUploads((prev) =>
          prev.map((u, i) => (i === index ? { ...u, state, error: err } : u))
        );
      }
    );

    if (assets.length > 0) {
      notifications.show({
        color: 'teal',
        message: `Uploaded ${assets.length} file${assets.length === 1 ? '' : 's'}`,
      });
    }
    if (failed > 0) {
      notifications.show({
        color: 'red',
        message: `${failed} file${failed === 1 ? '' : 's'} failed to upload`,
      });
    }

    // Leave the tray up briefly so a failed row is readable, then clear.
    setTimeout(() => setUploads([]), 2500);
    await load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !workspaceId) return;
    setDeleting(true);
    try {
      await mediaService.remove(workspaceId, pendingDelete.id);
      notifications.show({ color: 'teal', message: `Deleted ${pendingDelete.name}` });
      // Reloaded rather than spliced: the page is a window onto a longer list,
      // so removing one row should pull the next one up into it.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await load();
      setPendingDelete(null);
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not delete that file',
      });
    } finally {
      setDeleting(false);
    }
  };

  // A page that no longer holds the ticked assets should not keep them ticked.
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => items.some((a) => a.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulkDelete = async () => {
    if (!workspaceId || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const { deleted } = await mediaService.bulkRemove(workspaceId, [...selectedIds]);
      notifications.show({
        color: 'teal',
        message: `Deleted ${deleted.length} file${deleted.length === 1 ? '' : 's'}`,
      });
      setBulkConfirm(false);
      exitSelect();
      // Removing a chunk can empty the current page.
      if (deleted.length >= items.length && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not delete those files',
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Media</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Images, video and documents for this workspace.
          </Text>
        </div>
        <Group gap="xs">
          <Tooltip label="Refresh" withArrow>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Refresh library"
              loading={loading}
              onClick={() => load()}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          {items.length > 0 && (
            <Button
              variant={selectMode ? 'filled' : 'default'}
              leftSection={<IconChecklist size={16} />}
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            >
              {selectMode ? 'Done' : 'Select'}
            </Button>
          )}
          <Button
            leftSection={<IconUpload size={16} />}
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            Upload
          </Button>
        </Group>
      </Group>

      {selectMode && (
        <Group
          justify="space-between"
          p="xs"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            background: 'var(--mantine-color-default-hover)',
          }}
        >
          <Group gap="sm">
            <Text size="sm" fw={500}>
              {selectedIds.size} selected
            </Text>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => setSelectedIds(new Set(items.map((a) => a.id)))}
            >
              Select all on page
            </Button>
            {selectedIds.size > 0 && (
              <Button size="xs" variant="subtle" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            )}
          </Group>
          <Button
            size="xs"
            color="red"
            leftSection={<IconTrash size={14} />}
            disabled={selectedIds.size === 0}
            onClick={() => setBulkConfirm(true)}
          >
            Delete selected
          </Button>
        </Group>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void upload(e.currentTarget.files);
          // Cleared so choosing the same file twice still fires a change.
          e.currentTarget.value = '';
        }}
      />

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      {uploads.length > 0 && <UploadTray items={uploads} />}

      <Group gap="sm">
        <TextInput
          placeholder="Search by name"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Images', value: 'image' },
            { label: 'Video', value: 'video' },
            { label: 'Files', value: 'raw' },
          ]}
        />
      </Group>

      {loading ? (
        <MediaGridSkeleton count={PER_PAGE} />
      ) : items.length === 0 ? (
        <Center py={60}>
          <Stack align="center" gap="xs">
            <IconPhotoOff size={28} stroke={1.4} opacity={0.4} />
            <Text fw={600}>{query ? 'Nothing matches that' : 'No files yet'}</Text>
            <Text c="dimmed" size="sm">
              {query
                ? 'Try a different search.'
                : 'Upload images, video or documents to use across your pages.'}
            </Text>
            {!query && (
              <Button
                mt="xs"
                variant="light"
                leftSection={<IconUpload size={15} />}
                onClick={() => fileInput.current?.click()}
              >
                Upload files
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        <Box>
          <MediaGrid
            items={items}
            selectedIds={selectMode ? selectedIds : undefined}
            onToggleSelect={toggleSelect}
            renderActions={(asset) => (
              <>
                <TileAction label="Preview" onClick={() => setPreviewing(asset)}>
                  <IconEye size={14} />
                </TileAction>
                <TileAction label="Rename" onClick={() => setRenaming(asset)}>
                  <IconPencil size={14} />
                </TileAction>
                <TileAction label="Delete" color="red" onClick={() => setPendingDelete(asset)}>
                  <IconTrash size={14} />
                </TileAction>
              </>
            )}
          />
        </Box>
      )}

      {pageCount > 1 && (
        <Group justify="space-between" mt="xs">
          <Text size="xs" c="dimmed">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </Text>
          <Pagination
            size="sm"
            value={page}
            onChange={setPage}
            total={pageCount}
            withEdges={pageCount > 5}
          />
        </Group>
      )}

      <MediaPreviewModal asset={previewing} onClose={() => setPreviewing(null)} />

      <RenameModal
        // Keyed so the form resets to the asset being renamed each time.
        key={renaming?.id ?? 'none'}
        asset={renaming}
        workspaceId={workspaceId}
        onClose={() => setRenaming(null)}
        onSaved={(updated) => {
          setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          setRenaming(null);
        }}
      />

      <Modal
        opened={!!pendingDelete}
        onClose={() => !deleting && setPendingDelete(null)}
        title="Delete file"
        centered
      >
        <Stack>
          <Text size="sm">
            Delete <strong>{pendingDelete?.name}</strong>? Any page still using it will
            show a broken image. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={deleting} onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={bulkConfirm}
        onClose={() => !bulkDeleting && setBulkConfirm(false)}
        title={`Delete ${selectedIds.size} file${selectedIds.size === 1 ? '' : 's'}`}
        centered
      >
        <Stack>
          <Text size="sm">
            Delete <strong>{selectedIds.size}</strong> selected file
            {selectedIds.size === 1 ? '' : 's'}? Any page still using one will show a
            broken image. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={bulkDeleting}
              onClick={() => setBulkConfirm(false)}
            >
              Cancel
            </Button>
            <Button color="red" loading={bulkDeleting} onClick={confirmBulkDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function RenameModal({
  asset,
  workspaceId,
  onClose,
  onSaved,
}: {
  asset: MediaAsset | null;
  workspaceId?: string;
  onClose: () => void;
  onSaved: (asset: MediaAsset) => void;
}) {
  const [name, setName] = useState(asset?.name ?? '');
  const [alt, setAlt] = useState(asset?.alt ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!asset || !workspaceId || !name.trim()) return;
    setBusy(true);
    try {
      onSaved(
        await mediaService.update(workspaceId, asset.id, { name: name.trim(), alt: alt.trim() })
      );
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not save',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={!!asset} onClose={onClose} title="File details" centered>
      <Stack>
        <TextInput
          label="Name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {asset?.kind === 'image' && (
          <TextInput
            label="Alt text"
            description="Describes the image for screen readers and when it fails to load."
            value={alt}
            onChange={(e) => setAlt(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!name.trim()} onClick={save}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
