import { Box, Group, Text, ThemeIcon } from '@mantine/core';
import {
  IconCheck,
  IconFile,
  IconFileTypePdf,
  IconMovie,
  IconMusic,
  IconPhoto,
  IconX,
} from '@tabler/icons-react';
import { formatBytes, type UploadState } from './mediaService';
import classes from './UploadTray.module.css';

export interface UploadItem {
  file: File;
  state: UploadState;
  error?: string;
}

/**
 * A floating panel, pinned bottom-right, listing the files in an upload one row
 * each — which file is going up, which one failed — instead of a spinner on a
 * button. It floats so it never pushes the library around while it works.
 */
export function UploadTray({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.state === 'done').length;
  const failed = items.filter((i) => i.state === 'error').length;
  const busy = items.length - done - failed;

  return (
    <Box className={classes.tray}>
      <div className={classes.header}>
        {busy > 0
          ? `Uploading ${busy} file${busy === 1 ? '' : 's'}…`
          : failed > 0
            ? `${done} uploaded, ${failed} failed`
            : `Uploaded ${done} file${done === 1 ? '' : 's'}`}
      </div>
      <div className={classes.list}>
        {items.map((item, i) => (
          <Row key={`${item.file.name}-${i}`} item={item} />
        ))}
      </div>
    </Box>
  );
}

function Row({ item }: { item: UploadItem }) {
  return (
    <div className={classes.row}>
      <div className={classes.icon}>
        <FileIcon type={item.file.type} />
      </div>

      <div className={classes.body}>
        <Text size="sm" fw={500} lineClamp={1} title={item.file.name}>
          {item.file.name}
        </Text>
        <Text size="10px" c={item.state === 'error' ? 'red' : 'dimmed'}>
          {item.state === 'error'
            ? item.error || 'Upload failed'
            : item.state === 'done'
              ? 'Uploaded'
              : formatBytes(item.file.size)}
        </Text>
        {(item.state === 'queued' || item.state === 'uploading') && (
          <div className={classes.bar}>
            <div
              className={`${classes.fill} ${item.state === 'uploading' ? classes.fillIndeterminate : ''}`}
              style={item.state === 'queued' ? { width: '0%' } : undefined}
            />
          </div>
        )}
      </div>

      <StatusIcon state={item.state} />
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const size = 18;
  if (type === 'application/pdf') return <IconFileTypePdf size={size} stroke={1.4} />;
  if (type.startsWith('image/')) return <IconPhoto size={size} stroke={1.4} />;
  if (type.startsWith('video/')) return <IconMovie size={size} stroke={1.4} />;
  if (type.startsWith('audio/')) return <IconMusic size={size} stroke={1.4} />;
  return <IconFile size={size} stroke={1.4} />;
}

function StatusIcon({ state }: { state: UploadState }) {
  if (state === 'done') {
    return (
      <ThemeIcon color="teal" variant="light" size="sm" radius="xl">
        <IconCheck size={13} stroke={3} />
      </ThemeIcon>
    );
  }
  if (state === 'error') {
    return (
      <ThemeIcon color="red" variant="light" size="sm" radius="xl">
        <IconX size={13} stroke={3} />
      </ThemeIcon>
    );
  }
  return (
    <Group gap={0} w={22} justify="center">
      <Box className={classes.spinner} />
    </Group>
  );
}
