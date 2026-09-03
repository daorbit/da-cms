import { Node, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Stack, TextInput, Textarea, Paper } from '@mantine/core';
import { IconList } from '@tabler/icons-react';
import { BlockChrome } from './BlockChrome';

export const FeaturesBlock = Node.create({
  name: 'featuresBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      heading: { default: '' },
      /** One item per line — matches how the old sections inspector collected them. */
      items: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-features-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const items = String(node.attrs.items || '')
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean);

    return [
      'div',
      { ...HTMLAttributes, 'data-features-block': '' },
      [
        'div',
        { style: 'padding:16px' },
        node.attrs.heading ? ['h3', {}, node.attrs.heading] : '',
        ['ul', {}, ...items.map((item: string) => ['li', {}, item])],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FeaturesBlockView);
  },
});

function FeaturesBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const { heading, items } = node.attrs;

  return (
    <NodeViewWrapper>
      <BlockChrome icon={<IconList size={14} />} label="Features" selected={selected}>
        <Paper p="md" radius="md" withBorder bg="var(--mantine-color-body)">
          <Stack gap="xs">
            <TextInput
              placeholder="Why us"
              label="Heading"
              value={heading}
              onChange={(e) => updateAttributes({ heading: e.currentTarget.value })}
            />
            <Textarea
              placeholder={'Fast\nSecure\nSimple'}
              label="Items (one per line)"
              autosize
              minRows={3}
              value={items}
              onChange={(e) => updateAttributes({ items: e.currentTarget.value })}
            />
          </Stack>
        </Paper>
      </BlockChrome>
    </NodeViewWrapper>
  );
}
