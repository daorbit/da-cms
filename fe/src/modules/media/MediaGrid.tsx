import { Box, Text, ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconCheck, IconFile, IconFileTypePdf, IconMovie, IconMusic } from '@tabler/icons-react';
import { formatBytes, type MediaAsset } from './mediaService';
import classes from './MediaGrid.module.css';

interface Props {
  items: MediaAsset[];
  /** Highlights the asset a picker has chosen. */
  selectedId?: string | null;
  onSelect?: (asset: MediaAsset) => void;
  /** Per-item controls — rename, delete — shown on hover. */
  renderActions?: (asset: MediaAsset) => React.ReactNode;
}

/**
 * The library as a masonry wall.
 *
 * CSS columns rather than a grid: images arrive at whatever aspect ratio they
 * were uploaded at, and a fixed grid would either crop them all to one shape or
 * leave ragged gaps. Columns let each tile keep its own height.
 */
export function MediaGrid({ items, selectedId, onSelect, renderActions }: Props) {
  return (
    <Box className={classes.masonry}>
      {items.map((asset) => (
        <Box
          key={asset.id}
          className={`${classes.tile} ${selectedId === asset.id ? classes.selected : ''}`}
          onClick={() => onSelect?.(asset)}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={(e) => {
            if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onSelect(asset);
            }
          }}
        >
          <Preview asset={asset} />

          {selectedId === asset.id && (
            <Box className={classes.check}>
              <IconCheck size={14} stroke={3} />
            </Box>
          )}

          {renderActions && (
            <Box className={classes.actions}>
              <Group gap={4} justify="flex-end">
                {renderActions(asset)}
              </Group>
            </Box>
          )}

          <Box className={classes.meta}>
            <Text size="xs" fw={500} lineClamp={1} title={asset.name}>
              {asset.name}
            </Text>
            <Text size="10px" c="dimmed">
              {asset.width && asset.height
                ? `${asset.width}×${asset.height} · ${formatBytes(asset.bytes)}`
                : formatBytes(asset.bytes)}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * What a tile shows.
 *
 * Images and video have a real preview; everything else gets an icon, since a
 * PDF or a spreadsheet has nothing to show at this size that a filename does
 * not say better.
 */
function Preview({ asset }: { asset: MediaAsset }) {
  if (asset.kind === 'image' || (asset.kind === 'video' && asset.thumbnailUrl)) {
    return (
      <img
        src={asset.thumbnailUrl || asset.url}
        alt={asset.alt || asset.name}
        loading="lazy"
        className={classes.image}
      />
    );
  }

  return (
    <Box className={classes.fileTile}>
      <FileIcon mime={asset.mime} />
      <Text size="10px" c="dimmed" tt="uppercase" mt={6}>
        {asset.format || asset.mime.split('/')[1]}
      </Text>
    </Box>
  );
}

function FileIcon({ mime }: { mime: string }) {
  const size = 26;
  if (mime === 'application/pdf') return <IconFileTypePdf size={size} stroke={1.4} />;
  if (mime.startsWith('video/')) return <IconMovie size={size} stroke={1.4} />;
  if (mime.startsWith('audio/')) return <IconMusic size={size} stroke={1.4} />;
  return <IconFile size={size} stroke={1.4} />;
}

/** A hover action, styled to stay legible over any image. */
export function TileAction({
  label,
  onClick,
  color,
  children,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant="filled"
        color={color ?? 'dark'}
        size="sm"
        aria-label={label}
        onClick={(e) => {
          // The tile itself is clickable in a picker; an action is not a pick.
          e.stopPropagation();
          onClick();
        }}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
