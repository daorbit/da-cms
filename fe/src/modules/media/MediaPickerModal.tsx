import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Center,
  Group,
  Modal,
  Pagination,
  Stack,
  Text,
  TextInput,
  SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconUpload, IconPhotoOff } from '@tabler/icons-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { mediaService, type MediaAsset, type MediaKind } from './mediaService';
import { MediaGrid } from './MediaGrid';
import { UploadTray, type UploadItem } from './UploadTray';
import { MediaGridSkeleton } from '@/components/Skeletons';

/** Matches the library page, so the two feel like one wall. */
const PER_PAGE = 12;

interface Props {
  opened: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  /** Narrows the library to what the field can actually use. */
  kind?: MediaKind;
  title?: string;
}

/**
 * The library as a chooser.
 *
 * Uploading from here rather than sending the user to the Media page is the
 * point: picking an image for a hero usually means the image is not in the
 * library yet, and a round trip through another screen loses the page being
 * edited.
 */
export function MediaPickerModal({
  opened,
  onClose,
  onSelect,
  kind = 'image',
  title = 'Choose an image',
}: Props) {
  const workspace = useWorkspace();
  const workspaceId = workspace?.id;

  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploading = uploads.some((u) => u.state === 'queued' || u.state === 'uploading');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MediaKind | 'all'>(kind);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!workspaceId || !opened) return;
    setLoading(true);
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
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not load the library',
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, opened, filter, query, page]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  // Each opening starts clean rather than resuming the last search.
  useEffect(() => {
    if (opened) {
      setSelected(null);
      setQuery('');
      setFilter(kind);
      setPage(1);
    }
  }, [opened, kind]);

  // A narrowed result set may be shorter than the page being viewed.
  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length || !workspaceId) return;

    const files = Array.from(fileList);
    setUploads(files.map((file) => ({ file, state: 'queued' })));

    const { assets } = await mediaService.uploadMany(
      workspaceId,
      files,
      (index, state, _asset, error) => {
        setUploads((prev) =>
          prev.map((u, i) => (i === index ? { ...u, state, error } : u))
        );
      }
    );

    if (assets.length) {
      // Shown on the first page, which is where a new upload sorts to, and the
      // last one is pre-selected: uploading here is almost always "use this".
      setPage(1);
      setItems((prev) => [...assets, ...prev]);
      setSelected(assets[assets.length - 1]);
    }

    // Leave the tray up briefly so a failed row is readable, then clear.
    setTimeout(() => setUploads([]), 2500);
  };

  const confirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={1040}
      centered
      styles={{ title: { fontWeight: 600, fontSize: 'var(--mantine-font-size-lg)' } }}
    >
      <Stack>
        <Group gap="sm">
          <TextInput
            placeholder="Search by name"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <SegmentedControl
            size="xs"
            value={filter}
            onChange={(v) => setFilter(v as MediaKind | 'all')}
            data={[
              { label: 'Images', value: 'image' },
              { label: 'Video', value: 'video' },
              { label: 'Files', value: 'raw' },
              { label: 'All', value: 'all' },
            ]}
          />
          <Button
            variant="light"
            leftSection={<IconUpload size={15} />}
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            Upload
          </Button>
        </Group>

        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept={filter === 'image' ? 'image/*' : filter === 'video' ? 'video/*' : undefined}
          onChange={(e) => {
            void upload(e.currentTarget.files);
            e.currentTarget.value = '';
          }}
        />

        {uploads.length > 0 && <UploadTray items={uploads} />}

        <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {loading ? (
            <MediaGridSkeleton count={PER_PAGE} />
          ) : items.length === 0 ? (
            <Center py={50}>
              <Stack align="center" gap="xs">
                <IconPhotoOff size={26} stroke={1.4} opacity={0.4} />
                <Text size="sm" c="dimmed">
                  {query ? 'Nothing matches that.' : 'Nothing here yet — upload a file.'}
                </Text>
              </Stack>
            </Center>
          ) : (
            <MediaGrid
              items={items}
              selectedId={selected?.id}
              onSelect={setSelected}
              maxColumns={3}
            />
          )}
        </div>

        {pageCount > 1 && (
          <Group justify="center">
            <Pagination size="sm" value={page} onChange={setPage} total={pageCount} />
          </Group>
        )}

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {selected ? selected.name : 'Select a file'}
          </Text>
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!selected} onClick={confirm}>
              Use this file
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
