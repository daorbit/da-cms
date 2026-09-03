import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';
import { Button } from '@/components/tiptap-ui-primitive/button';
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { LinkPopover } from '@/components/tiptap-ui/link-popover';
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover';
import { IconSparkles } from '@tabler/icons-react';

interface Props {
  editor: Editor;
  /** Opens the AI panel for the current selection. Wired to a stub until the AI feature ships. */
  onImprove: (editor: Editor) => void;
}

/**
 * The floating toolbar that appears over a text selection — same buttons as
 * the fixed toolbar, reused rather than rebuilt, plus an "Improve" entry
 * point for AI editing once that backend exists.
 */
export function SelectionToolbar({ editor, onImprove }: Props) {
  return (
    <BubbleMenu editor={editor} options={{ placement: 'top' }}>
      <Toolbar variant="floating">
        <ToolbarGroup>
          {/* mousedown on a bubble-menu button normally fires before click and
              collapses the text selection, which hides the menu (and the
              button under the pointer) before the click ever lands — this
              keeps the selection alive so the click actually reaches Improve. */}
          <Button
            variant="ghost"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onImprove(editor)}
          >
            <IconSparkles className="tiptap-button-icon" size={16} />
            Improve
          </Button>
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
