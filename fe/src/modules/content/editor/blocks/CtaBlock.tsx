import { Node, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Stack, TextInput, Paper } from '@mantine/core';
import { IconClick } from '@tabler/icons-react';
import { BlockChrome } from './BlockChrome';

export const CtaBlock = Node.create({
  name: 'ctaBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      heading: { default: '' },
      label: { default: '' },
      href: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-cta-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      { ...HTMLAttributes, 'data-cta-block': '' },
      [
        'div',
        { style: 'text-align:center;padding:24px 16px' },
        ['h3', {}, node.attrs.heading || 'Ready to start?'],
        node.attrs.label ? ['a', { href: node.attrs.href || '#' }, node.attrs.label] : '',
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaBlockView);
  },
});

function CtaBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const { heading, label, href } = node.attrs;

  return (
    <NodeViewWrapper>
      <BlockChrome icon={<IconClick size={14} />} label="Call to action" selected={selected}>
        <Paper p="md" radius="md" withBorder bg="var(--mantine-color-body)">
          <Stack gap="xs">
            <TextInput
              placeholder="Ready to start?"
              label="Heading"
              value={heading}
              onChange={(e) => updateAttributes({ heading: e.currentTarget.value })}
            />
            <TextInput
              placeholder="Sign up"
              label="Button label"
              value={label}
              onChange={(e) => updateAttributes({ label: e.currentTarget.value })}
            />
            <TextInput
              placeholder="/signup"
              label="Button link"
              value={href}
              onChange={(e) => updateAttributes({ href: e.currentTarget.value })}
            />
          </Stack>
        </Paper>
      </BlockChrome>
    </NodeViewWrapper>
  );
}
