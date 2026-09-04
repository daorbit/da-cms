import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconExternalLink, IconX } from '@tabler/icons-react';
import { type DeviceId } from './DeviceFrame';
import { DeviceSwitch } from './DeviceSwitch';
import classes from './PreviewModal.module.css';

interface Props {
  title: string;
  device: DeviceId;
  onDeviceChange: (device: DeviceId) => void;
  /** External URL of the previewed document, opened in a new tab. */
  openHref?: string;
  onClose: () => void;
}

/** The preview's chrome: which device is on the stage, and what to do about it. */
export function PreviewTopbar({ title, device, onDeviceChange, openHref, onClose }: Props) {
  return (
    <Group justify="space-between" className={classes.topbar} wrap="nowrap">
      <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm" truncate className={classes.topbarTitle}>
          {title || 'Untitled'}
        </Text>
      </Group>

      <DeviceSwitch device={device} onChange={onDeviceChange} />

      <Group justify="flex-end" gap="xs" style={{ flex: 1 }} wrap="nowrap">
        {openHref && (
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            component="a"
            href={openHref}
            target="_blank"
            rel="noopener"
            leftSection={<IconExternalLink size={14} />}
          >
            Open
          </Button>
        )}
        <Tooltip label="Close preview" withArrow>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={onClose} aria-label="Close">
            <IconX size={19} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
