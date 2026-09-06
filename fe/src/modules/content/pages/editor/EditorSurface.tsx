import { Box } from '@mantine/core';
import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';
import classes from './EditorSurface.module.css';

interface Props {
  content: string;
  onContentChange: (html: string) => void;
}


export function EditorSurface({ content, onContentChange }: Props) {
  return (
 
    <Box className={classes.surface}>
      <PageBodyEditor value={content} onChange={onContentChange} placeholder="Start writing…" />
    </Box>
  );
}
