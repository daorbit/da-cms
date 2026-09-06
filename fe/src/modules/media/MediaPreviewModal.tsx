import { Anchor, Button, Center, Group, Modal, Stack, Text } from '@mantine/core';
import { IconDownload, IconExternalLink, IconFile } from '@tabler/icons-react';
import { formatBytes, type MediaAsset } from './mediaService';

 
export function MediaPreviewModal({
  asset,
  onClose,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={!!asset}
      onClose={onClose}
      title={asset?.name}
      size="xl"
      centered
      styles={{ title: { fontWeight: 600 } }}
    >
      {asset && (
        <Stack gap="md">
          <Center
            style={{
              background: 'var(--mantine-color-default-hover)',
              borderRadius: 'var(--mantine-radius-md)',
              overflow: 'hidden',
              minHeight: 200,
            }}
          >
            <Body asset={asset} />
          </Center>

          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Text size="sm" c="dimmed">
                {[
                  asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
                  formatBytes(asset.bytes),
                  asset.format?.toUpperCase() || asset.mime,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {asset.alt && (
                <Text size="sm" mt={4}>
                  {asset.alt}
                </Text>
              )}
              <Anchor
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                style={{ wordBreak: 'break-all' }}
              >
                {asset.url}
              </Anchor>
            </div>

            <Group gap="xs" wrap="nowrap">
              <Button
                component="a"
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="default"
                size="xs"
                leftSection={<IconExternalLink size={14} />}
              >
                Open
              </Button>
              <Button
                component="a"
                href={asset.url}
                download={asset.name}
                variant="light"
                size="xs"
                leftSection={<IconDownload size={14} />}
              >
                Download
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

function Body({ asset }: { asset: MediaAsset }) {
  if (asset.kind === 'image') {
    return (
      <img
        src={asset.url}
        alt={asset.alt || asset.name}
        style={{ maxWidth: '100%', maxHeight: '65vh', display: 'block' }}
      />
    );
  }

  if (asset.kind === 'video') {
    // Audio uploads share the video pipeline, so both arrive here; a <video>
    // element plays audio too, and shows nothing but controls for it.
    return (
      <video
        src={asset.url}
        controls
        style={{ maxWidth: '100%', maxHeight: '65vh', display: 'block' }}
      />
    );
  }

  return (
    <Stack align="center" gap="xs" py="xl">
      <IconFile size={34} stroke={1.3} opacity={0.4} />
      <Text size="sm" c="dimmed">
        No preview for this file type
      </Text>
    </Stack>
  );
}
