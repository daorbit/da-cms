import { Box } from '@mantine/core';
import { PageBodyEditor } from '@/modules/content/components/PageBodyEditor';

interface Props {
  content: string;
  onContentChange: (html: string) => void;
}


export function EditorSurface({ content, onContentChange }: Props) {
  return (
 
    <Box style={{ flex: 1, minHeight: 0 }}>
      <PageBodyEditor value={content} onChange={onContentChange} placeholder="Start writing…" />
    </Box>
  );
}
