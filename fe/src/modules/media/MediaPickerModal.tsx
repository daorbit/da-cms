import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Center,
  Group,
  Loader,
  Modal,
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
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MediaKind | 'all'>(kind);
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!workspaceId || !opened) return;
    setLoading(true);
    try {
      const res = await mediaService.list(workspaceId, {
        kind: filter === 'all' ? undefined : filter,
        q: query,
        perPage: 100,
      });
      setItems(res.items);
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Could not load the library',
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, opened, filter, query]);

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
    }
  }, [opened, kind]);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !workspaceId) return;

    setUploading(true);
    try {
      const asset = await mediaService.upload(workspaceId, files[0]);
      // Picked straight away: uploading here is almost always "use this one".
      setItems((prev) => [asset, ...prev]);
      setSelected(asset);
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof ApiError ? err.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  const confirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="xl" centered>
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
          hidden
          accept={filter === 'image' ? 'image/*' : filter === 'video' ? 'video/*' : undefined}
          onChange={(e) => {
            void upload(e.currentTarget.files);
            e.currentTarget.value = '';
          }}
        />

        <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {loading ? (
            <Center py={50}>
              <Loader size="sm" />
            </Center>
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
            <MediaGrid items={items} selectedId={selected?.id} onSelect={setSelected} />
          )}
        </div>

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
