import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Center, Loader, Stack } from '@mantine/core';
import { usePageEditor } from '@/modules/content/pages/editor/usePageEditor';
import { PageEditorToolbar } from '@/modules/content/pages/editor/PageEditorToolbar';
import { EditorSurface } from '@/modules/content/pages/editor/EditorSurface';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { pageService } from '@/modules/content/pageService';

/**
 * Shell only: wires the editor state hook to the toolbar and the writing
 * surface. Content preview is a full-screen modal; page metadata lives on its
 * own /details route.
 */
export function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [previewOpen, setPreviewOpen] = useState(false);

  const editor = usePageEditor(id);

  if (editor.loading) {
    return (
      <Center py={80}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <PageEditorToolbar
        title={editor.title}
        slug={editor.slug}
        status={editor.status}
        saving={editor.saving}
        onBack={() => navigate(`/${editor.workspace?.slug}/content/pages`)}
        onOpenDetails={() => navigate(`/${editor.workspace?.slug}/content/pages/${id}/details`)}
        onPreview={() => setPreviewOpen(true)}
        onSave={() => editor.save(editor.status === 'published' ? 'published' : 'draft')}
        onPublishToggle={() => editor.save(editor.status === 'published' ? 'draft' : 'published')}
      />

      {editor.error && (
        <Alert color="red" variant="light">
          {editor.error}
        </Alert>
      )}

      <EditorSurface content={editor.content} onContentChange={editor.setContent} />

      {editor.workspace && id && (
        <ContentPreviewModal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={editor.title}
          src={pageService.previewUrl(editor.workspace.id, id)}
        />
      )}
    </Stack>
  );
}
