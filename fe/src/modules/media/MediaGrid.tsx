import { Box, Checkbox, Text, ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconCheck, IconFile, IconFileTypePdf, IconMovie, IconMusic } from '@tabler/icons-react';
import { formatBytes, type MediaAsset } from './mediaService';
import classes from './MediaGrid.module.css';

interface Props {
  items: MediaAsset[];
  selectedId?: string | null;
  onSelect?: (asset: MediaAsset) => void;
  renderActions?: (asset: MediaAsset) => React.ReactNode;
  /** Widest column count. Fewer columns = bigger tiles (the picker wants this). */
  maxColumns?: 3 | 4;
  /** IDs ticked for a bulk action. When passed, a tile click toggles the tick. */
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}


export function MediaGrid({
  items,
  selectedId,
  onSelect,
  renderActions,
  maxColumns = 4,
  selectedIds,
  onToggleSelect,
}: Props) {
  const multiSelect = !!selectedIds;

  return (
    <Box
      className={`${classes.masonry} ${maxColumns === 3 ? classes.threeUp : ''}`}
    >
      {items.map((asset) => {
        const ticked = selectedIds?.has(asset.id) ?? false;
        const activate = multiSelect
          ? () => onToggleSelect?.(asset.id)
          : onSelect
            ? () => onSelect(asset)
            : undefined;

        return (
        <Box
          key={asset.id}
          className={`${classes.tile} ${
            (multiSelect ? ticked : selectedId === asset.id) ? classes.selected : ''
          }`}
          onClick={activate}
          role={activate ? 'button' : undefined}
          tabIndex={activate ? 0 : undefined}
          onKeyDown={(e) => {
            if (activate && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              activate();
            }
          }}
        >
          <Preview asset={asset} />

          {multiSelect && (
            <Box className={classes.pick} onClick={(e) => e.stopPropagation()}>
              <Checkbox
                size="xs"
                checked={ticked}
                onChange={() => onToggleSelect?.(asset.id)}
                aria-label={`Select ${asset.name}`}
              />
            </Box>
          )}

          {!multiSelect && selectedId === asset.id && (
            <Box className={classes.check}>
              <IconCheck size={14} stroke={3} />
            </Box>
          )}

          {!multiSelect && renderActions && (
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
        );
      })}
    </Box>
  );
}

 
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
        {asset.format || asset.mime?.split('/')[1] || 'file'}
      </Text>
    </Box>
  );
}

function FileIcon({ mime }: { mime?: string }) {
  const size = 26;
  if (mime === 'application/pdf') return <IconFileTypePdf size={size} stroke={1.4} />;
  if (mime?.startsWith('video/')) return <IconMovie size={size} stroke={1.4} />;
  if (mime?.startsWith('audio/')) return <IconMusic size={size} stroke={1.4} />;
  return <IconFile size={size} stroke={1.4} />;
}

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
          e.stopPropagation();
          onClick();
        }}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
