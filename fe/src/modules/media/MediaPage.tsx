import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
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
} from '@tabler/icons-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { mediaService, type MediaAsset, type MediaKind } from './mediaService';
import { MediaGrid, TileAction } from './MediaGrid';
import { MediaPreviewModal } from './MediaPreviewModal';

type Filter = 'all' | MediaKind;

/** Assets per page. A wall of twelve fills the columns without endless scroll. */
const PER_PAGE = 12;

/**
 * The workspace's media library: everything uploaded, in one wall.
 *
 * The same grid backs the picker a page's hero and thumbnail fields open, so an
 * asset uploaded here is immediately choosable there, and one chosen there is
 * managed here.
 */
export function MediaPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace?.id;

  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<MediaAsset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [previewing, setPreviewing] = useState<MediaAsset | null>(null);

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

  const upload = async (files: FileList | null) => {
    if (!files?.length || !workspaceId) return;

    setUploading(true);
    setError(null);
    // Sequential rather than parallel: each request carries a whole file, and a
    // dozen at once is a good way to be rate-limited or to exhaust memory.
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        await mediaService.upload(workspaceId, file);
      } catch (err) {
        failed += 1;
        notifications.show({
          color: 'red',
          title: file.name,
          message: err instanceof ApiError ? err.message : 'Upload failed',
        });
      }
    }
    setUploading(false);

    const added = files.length - failed;
    if (added > 0) {
      notifications.show({
        color: 'teal',
        message: `Uploaded ${added} file${added === 1 ? '' : 's'}`,
      });
    }
    await load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !workspaceId) return;
    try {
      await mediaService.remove(workspaceId, pendingDelete.id);
      notifications.show({ color: 'teal', message: `Deleted ${pendingDelete.name}` });
      // Reloaded rather than spliced: the page is a window onto a longer list,
      // so removing one row should pull the next one up into it.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not delete that file',
      });
    } finally {
      setPendingDelete(null);
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
          <Button
            leftSection={<IconUpload size={16} />}
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            Upload
          </Button>
        </Group>
      </Group>

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
        <Center py={60}>
          <Loader size="sm" />
        </Center>
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
        onClose={() => setPendingDelete(null)}
        title="Delete file"
        centered
      >
        <Stack>
          <Text size="sm">
            Delete <strong>{pendingDelete?.name}</strong>? Any page still using it will
            show a broken image. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete}>
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
