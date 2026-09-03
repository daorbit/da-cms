import { Badge, Group } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * Shared frame for every custom node view: a small type label so it reads as
 * a distinct block rather than plain body text, and a selected outline that
 * matches how TipTap already highlights an atom node.
 */
export function BlockChrome({
  icon, label, selected, children,
}: {
  icon: ReactNode;
  label: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        outline: selected ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
        outlineOffset: 2,
      }}
      contentEditable={false}
    >
      <Group gap={6} mb={4}>
        {icon}
        <Badge size="xs" variant="light" color="gray" tt="none">
          {label}
        </Badge>
      </Group>
      {children}
    </div>
  );
}
