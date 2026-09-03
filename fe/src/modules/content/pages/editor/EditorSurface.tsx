import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';

interface Props {
  body: string;
  onBodyChange: (html: string) => void;
}

/**
 * The edit-mode pane. One writing surface, full width — hero/CTA/features
 * blocks insert inline via the editor's own slash command now, so there is
 * no separate sections rail to lay out beside it.
 */
export function EditorSurface({ body, onBodyChange }: Props) {
  return <PageBodyEditor value={body} onChange={onBodyChange} placeholder="Start writing…" />;
}
