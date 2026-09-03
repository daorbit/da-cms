import { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { LinkPopover } from '@/components/tiptap-ui/link-popover';
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover';
import { AiImproveMenu, type AiAction } from '@/modules/content/editor/AiImproveMenu';

interface Props {
  editor: Editor;
  /** Every "Improve" menu item routes here. Wired to a stub until this app's own AI backend exists. */
  onAiAction: (action: AiAction, detail: { editor: Editor; option?: string }) => void;
}

/**
 * The floating toolbar that appears over a text selection — same buttons as
 * the fixed toolbar, reused rather than rebuilt, plus an "Improve" entry
 * point for AI editing once that backend exists.
 */
export function SelectionToolbar({ editor, onAiAction }: Props) {
  // Opening the Improve dropdown moves focus off the editor, which the
  // default shouldShow treats as "hide the menu" — this keeps the bubble
  // menu open for as long as either the selection is non-empty or the
  // dropdown itself is open, so picking an item doesn't vanish mid-click.
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  return (
    <BubbleMenu
      editor={editor}
      className="selection-toolbar-portal"
      options={{ placement: 'top' }}
      shouldShow={({ editor: instance, state }) =>
        instance.isEditable && (!state.selection.empty || aiMenuOpen)}
    >
      <Toolbar variant="floating">
        <ToolbarGroup>
          <AiImproveMenu editor={editor} onAction={onAiAction} onOpenChange={setAiMenuOpen} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <MarkButton type="bold" />
          <MarkButton type="italic" />
          <MarkButton type="underline" />
          <MarkButton type="strike" />
          <MarkButton type="code" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <LinkPopover />
          <ColorHighlightPopover />
        </ToolbarGroup>
      </Toolbar>
    </BubbleMenu>
  );
}
