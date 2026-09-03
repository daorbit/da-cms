import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Center, Loader, Stack } from '@mantine/core';
import { usePageEditor } from '@/modules/content/pages/editor/usePageEditor';
import { PageEditorToolbar } from '@/modules/content/pages/editor/PageEditorToolbar';
import { EditorSurface } from '@/modules/content/pages/editor/EditorSurface';
import { PagePreview } from '@/modules/content/pages/editor/PagePreview';
import { PageSettingsModal } from '@/modules/content/pages/editor/PageSettingsModal';

/**
 * Shell only: wires the editor state hook to the toolbar, the writing
 * surface (edit mode) or preview, and the settings modal. Each of those owns
 * its own layout — this component just decides which is on screen.
 */
export function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        mode={mode}
        onModeChange={setMode}
        saving={editor.saving}
        onBack={() => navigate(`/${editor.workspace?.slug}/content/pages`)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSave={() => editor.save(editor.status === 'published' ? 'published' : 'draft')}
        onPublishToggle={() => editor.save(editor.status === 'published' ? 'draft' : 'published')}
      />

      {editor.error && (
        <Alert color="red" variant="light">
          {editor.error}
        </Alert>
      )}

      {mode === 'edit' ? (
        <EditorSurface
          editorType={editor.editorType}
          body={editor.body}
          onBodyChange={editor.setBody}
          bodyBlocks={editor.bodyBlocks}
          onBodyBlocksChange={(blocks, html) => {
            editor.setBodyBlocks(blocks);
            editor.setBody(html);
          }}
          sections={editor.sections}
          onAddSection={editor.addSection}
          onUpdateSection={editor.updateSection}
          onMoveSection={editor.moveSection}
          onRemoveSection={editor.removeSection}
        />
      ) : (
        <PagePreview
          title={editor.title}
          description={editor.description}
          heroImage={editor.heroImage}
          body={editor.body}
          sections={editor.sections}
        />
      )}

      <PageSettingsModal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={editor.title}
        onTitleChange={editor.setTitle}
        slug={editor.slug}
        onSlugChange={editor.setSlug}
        description={editor.description}
        onDescriptionChange={editor.setDescription}
        heroImage={editor.heroImage}
        onHeroImageChange={editor.setHeroImage}
        thumbnailImage={editor.thumbnailImage}
        onThumbnailImageChange={editor.setThumbnailImage}
        seo={editor.seo}
        onSeoChange={editor.setSeo}
      />
    </Stack>
  );
}
