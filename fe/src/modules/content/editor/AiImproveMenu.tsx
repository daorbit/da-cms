import type { Editor } from '@tiptap/react';
import { Button } from '@/components/tiptap-ui-primitive/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/tiptap-ui-primitive/dropdown-menu';
import { ChevronDownIcon } from '@/components/tiptap-icons/chevron-down-icon';
import {
  IconSparkles, IconWand, IconSpeakerphone, IconArrowAutofitWidth, IconArrowsMinimize,
  IconAlignLeft, IconMoodSmile, IconMessageChatbot, IconTextWrapDisabled, IconFileText,
  IconLanguage,
} from '@tabler/icons-react';

export type AiAction =
  | 'adjust-tone' | 'fix-grammar' | 'extend' | 'reduce' | 'simplify' | 'emojify'
  | 'ask-ai' | 'complete' | 'summarize' | 'translate';

const TONES = ['Professional', 'Casual', 'Confident', 'Friendly', 'Straightforward'] as const;
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi'] as const;

interface Props {
  editor: Editor;
  /** Every entry routes here for now — swapped for the real AI backend later. */
  onAction: (action: AiAction, detail: { editor: Editor; option?: string }) => void;
  /** Lets the caller keep its own floating menu open while this one is. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * The "Improve" dropdown from Tiptap's AI toolbar — same menu shape (tone
 * submenu, grammar/length/emoji actions, ask/complete/summarize/translate),
 * with every item wired to a stub. This app's own AI backend replaces
 * `onAction`'s body once it exists; the menu itself doesn't depend on
 * Tiptap's cloud AI service.
 */
export function AiImproveMenu({ editor, onAction, onOpenChange }: Props) {
  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" tooltip="Improve with AI">
          <IconSparkles className="tiptap-button-icon" size={16} />
          Improve
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <IconWand className="tiptap-button-icon" size={16} />
              Adjust tone
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TONES.map((tone) => (
                <DropdownMenuItem key={tone} onSelect={() => onAction('adjust-tone', { editor, option: tone })}>
                  {tone}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onSelect={() => onAction('fix-grammar', { editor })}>
            <IconSpeakerphone className="tiptap-button-icon" size={16} />
            Fix spelling &amp; grammar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('extend', { editor })}>
            <IconArrowAutofitWidth className="tiptap-button-icon" size={16} />
            Extend text
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('reduce', { editor })}>
            <IconArrowsMinimize className="tiptap-button-icon" size={16} />
            Reduce text
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('simplify', { editor })}>
            <IconAlignLeft className="tiptap-button-icon" size={16} />
            Simplify text
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('emojify', { editor })}>
            <IconMoodSmile className="tiptap-button-icon" size={16} />
            Emojify
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onAction('ask-ai', { editor })}>
            <IconMessageChatbot className="tiptap-button-icon" size={16} />
            Ask AI
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('complete', { editor })}>
            <IconTextWrapDisabled className="tiptap-button-icon" size={16} />
            Complete sentence
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('summarize', { editor })}>
            <IconFileText className="tiptap-button-icon" size={16} />
            Summarize
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <IconLanguage className="tiptap-button-icon" size={16} />
              Translate
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem key={lang} onSelect={() => onAction('translate', { editor, option: lang })}>
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
