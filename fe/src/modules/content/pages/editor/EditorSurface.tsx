import { Box } from '@mantine/core';
import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';
import classes from './EditorSurface.module.css';

interface Props {
  content: string;
  onContentChange: (html: string) => void;
  /** Raised while Orbit is writing, so the toolbar can lock saving. */
  onGeneratingChange?: (generating: boolean) => void;
  pageTitle?: string;
  pageDescription?: string;
}


export function EditorSurface({
  content,
  onContentChange,
  onGeneratingChange,
  pageTitle,
  pageDescription,
}: Props) {
  return (

    <Box className={classes.surface}>
      <PageBodyEditor
        value={content}
        onChange={onContentChange}
        placeholder="Start writing…"
        onGeneratingChange={onGeneratingChange}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
      />
    </Box>
  );
}
