import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';

interface Props {
  content: string;
  onContentChange: (html: string) => void;
}

/**
 * The edit-mode pane. One writing surface, full width — hero/CTA/features
 * blocks insert inline via the editor's own slash command now, so there is
 * no separate sections rail to lay out beside it.
 */
export function EditorSurface({ content, onContentChange }: Props) {
  return <PageBodyEditor value={content} onChange={onContentChange} placeholder="Start writing…" />;
}
