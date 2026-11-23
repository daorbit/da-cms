import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Center,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconUpload, IconPhotoOff } from '@tabler/icons-react';
import type { MediaAsset, MediaKind } from './mediaService';
import { MediaGrid } from './MediaGrid';
import { MediaGridSkeleton } from './MediaGridSkeleton';
import { MediaPager } from './MediaPager';
import { UploadTray } from './UploadTray';
import { useMediaLibrary, type MediaFilter } from './useMediaLibrary';
import classes from './MediaPickerModal.module.css';

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
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={1040}
      centered
      classNames={{ title: classes.title }}
    >
      <MediaPicker kind={kind} onClose={onClose} onSelect={onSelect} />
    </Modal>
  );
}

/** Separate from the modal so it remounts, and so starts clean, on each opening. */
function MediaPicker({
  kind,
  onClose,
  onSelect,
}: Pick<Props, 'onClose' | 'onSelect'> & { kind: MediaKind }) {
  const library = useMediaLibrary(kind);
  const { items, loading, error, query, filter, uploads } = library;
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) notifications.show({ color: 'red', message: error });
  }, [error]);

  const upload = async (fileList: FileList | null) => {
    const { assets } = await library.upload(fileList);
    // Uploading from here is almost always "use this".
    if (assets.length > 0) setSelected(assets[assets.length - 1]);
  };

  const confirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  return (
    <Stack>
      <Group gap="sm">
        <TextInput
          placeholder="Search by name"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => library.setQuery(e.currentTarget.value)}
          className={classes.search}
        />
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(v) => library.setFilter(v as MediaFilter)}
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
          loading={library.uploading}
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

      <div className={classes.wall}>
        {loading ? (
          <MediaGridSkeleton maxColumns={3} />
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

      <MediaPager page={library.page} total={library.total} onChange={library.setPage} />

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
  );
}
