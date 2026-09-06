import { Box } from '@mantine/core';
import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';
import classes from './EditorSurface.module.css';

interface Props {
  content: string;
  onContentChange: (html: string) => void;
  /** Raised while Orbit is writing, so the toolbar can lock saving. */
  onGeneratingChange?: (generating: boolean) => void;
}


export function EditorSurface({ content, onContentChange, onGeneratingChange }: Props) {
  return (
 
    <Box className={classes.surface}>
      <PageBodyEditor
        value={content}
        onChange={onContentChange}
        placeholder="Start writing…"
        onGeneratingChange={onGeneratingChange}
      />
    </Box>
  );
}
