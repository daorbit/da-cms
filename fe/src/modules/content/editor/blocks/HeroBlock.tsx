import { Node, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Stack, TextInput, Textarea, Paper } from '@mantine/core';
import { IconLayoutList } from '@tabler/icons-react';
import { BlockChrome } from './BlockChrome';

/**
 * A hero banner, editable in place. Attrs carry the same shape the old
 * `hero` section used, so nothing downstream (preview, exported HTML) needs
 * to know this used to live in a separate sections panel.
 */
export const HeroBlock = Node.create({
  name: 'heroBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      heading: { default: '' },
      subheading: { default: '' },
      ctaLabel: { default: '' },
      ctaHref: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-hero-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      { ...HTMLAttributes, 'data-hero-block': '' },
      [
        'div',
        { style: 'text-align:center;padding:32px 16px' },
        ['h2', {}, node.attrs.heading || 'Untitled hero'],
        node.attrs.subheading ? ['p', {}, node.attrs.subheading] : '',
        node.attrs.ctaLabel ? ['a', { href: node.attrs.ctaHref || '#' }, node.attrs.ctaLabel] : '',
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeroBlockView);
  },
});

function HeroBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const { heading, subheading, ctaLabel, ctaHref } = node.attrs;

  return (
    <NodeViewWrapper>
      <BlockChrome icon={<IconLayoutList size={14} />} label="Hero" selected={selected}>
        <Paper p="md" radius="md" withBorder bg="var(--mantine-color-body)">
          <Stack gap="xs">
            <TextInput
              placeholder="Build something great"
              label="Heading"
              value={heading}
              onChange={(e) => updateAttributes({ heading: e.currentTarget.value })}
            />
            <Textarea
              placeholder="A sentence that explains the product."
              label="Subheading"
              autosize
              minRows={2}
              value={subheading}
              onChange={(e) => updateAttributes({ subheading: e.currentTarget.value })}
            />
            <TextInput
              placeholder="Get started"
              label="Button label"
              value={ctaLabel}
              onChange={(e) => updateAttributes({ ctaLabel: e.currentTarget.value })}
            />
            <TextInput
              placeholder="/signup"
              label="Button link"
              value={ctaHref}
              onChange={(e) => updateAttributes({ ctaHref: e.currentTarget.value })}
            />
          </Stack>
        </Paper>
      </BlockChrome>
    </NodeViewWrapper>
  );
}
