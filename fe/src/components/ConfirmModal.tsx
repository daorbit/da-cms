import type { ReactNode } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

interface Props {
  opened: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A short confirmation with Cancel as the safe default. */
export function ConfirmModal({
  opened, title, children, confirmLabel, busy, destructive = true, onConfirm, onClose,
}: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="sm">
      <Stack>
        <Text size="sm">{children}</Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} data-autofocus>
            Cancel
          </Button>
          <Button color={destructive ? 'red' : undefined} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
