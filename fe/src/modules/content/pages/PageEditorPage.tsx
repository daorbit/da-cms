import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { usePageEditor } from '@/modules/content/pages/editor/usePageEditor';
import { PageEditorToolbar } from '@/modules/content/pages/editor/PageEditorToolbar';
import { EditorSurface } from '@/modules/content/pages/editor/EditorSurface';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { pageService } from '@/modules/content/pageService';
import { Skeleton } from '@mantine/core';
import { HeaderSkeleton } from '@/components/Skeletons';
// Version history is built but switched off for now — see RevisionHistoryModal.
// import { RevisionHistoryModal } from '@/modules/content/pages/editor/RevisionHistoryModal';
import { SeoPanel } from '@/modules/content/pages/editor/SeoPanel';

/**
 * Shell only: wires the editor state hook to the toolbar and the writing
 * surface. Content preview is a full-screen modal; page metadata lives on its
 * own /details route.
 */
export function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  // const [historyOpen, setHistoryOpen] = useState(false);
  // Open by default: metadata is part of writing a page, not an afterthought
  // behind a button someone has to remember to press.
  const [seoOpen, setSeoOpen] = useState(true);
  // Saving mid-generation would write a half-finished document, so the toolbar
  // is locked until Orbit has stopped.
  const [generating, setGenerating] = useState(false);

  const editor = usePageEditor(id);

  /**
   * In-app navigation away from unsaved work.
   *
   * The browser's own prompt covers a tab close or reload but never fires for a
   * route change, which is how someone actually leaves this screen.
   */
  const leave = (to: string) => {
    if (editor.dirty) setPendingRoute(to);
    else navigate(to);
  };

  if (editor.loading) {
    return (
      <Stack gap="md" p="lg">
        <HeaderSkeleton />
        <Skeleton height={44} radius="sm" />
        <Skeleton height={420} radius="sm" />
      </Stack>
    );
  }

  // The shell runs this route flush so the editor reaches both edges; the
  // header and any error above it take back the inset for themselves.
  return (
    <Stack gap="md" h="100%" pt="lg" miw={0} style={{ overflow: 'hidden' }}>
      <Box px="lg">
        <PageEditorToolbar
          title={editor.title}
          status={editor.status}
          savingAction={editor.savingAction}
          dirty={editor.dirty}
          savedAt={editor.savedAt}
          generating={generating}
          onBack={() => leave(`/${editor.workspace?.slug}/content/pages`)}
          onOpenDetails={() =>
            leave(`/${editor.workspace?.slug}/content/pages/${id}/details`)
          }
          onPreview={() => setPreviewOpen(true)}
          seoOpen={seoOpen}
          onToggleSeo={() => setSeoOpen((v) => !v)}
          onSave={() => editor.save(editor.status === 'published' ? 'published' : 'draft', 'save')}
          onPublishToggle={() =>
            editor.save(editor.status === 'published' ? 'draft' : 'published', 'publish')
          }
        />
      </Box>

      {editor.error && (
        <Alert color="red" variant="light" mx="lg">
          {editor.error}
        </Alert>
      )}

      <Box style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        <EditorSurface
          content={editor.content}
          onContentChange={editor.setContent}
          onGeneratingChange={setGenerating}
        />

        {seoOpen && (
          <SeoPanel
            seo={editor.seo}
            onChange={editor.setSeo}
            onClose={() => setSeoOpen(false)}
            pageTitle={editor.title}
            pageDescription={editor.description}
            heroImage={editor.heroImage}
          />
        )}
      </Box>

      <Modal
        opened={pendingRoute !== null}
        onClose={() => setPendingRoute(null)}
        title="Unsaved changes"
        centered
      >
        <Stack>
          <Text size="sm">
            This page has changes that have not been saved. Leaving now discards
            them.
          </Text>
          {/* One row: three choices of equal standing, and wrapping split them
              into what read as two separate decisions. */}
          <Group justify="flex-end" gap="xs" wrap="nowrap">
            <Button variant="default" onClick={() => setPendingRoute(null)}>
              Keep editing
            </Button>
            <Button
              color="red"
              variant="light"
              onClick={() => {
                const to = pendingRoute!;
                setPendingRoute(null);
                navigate(to);
              }}
            >
              Discard and leave
            </Button>
            <Button
              loading={editor.saving}
              onClick={async () => {
                await editor.save(
                  editor.status === 'published' ? 'published' : 'draft'
                );
                const to = pendingRoute!;
                setPendingRoute(null);
                navigate(to);
              }}
            >
              Save and leave
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Version history, off for now:
      {editor.workspace && id && (
        <RevisionHistoryModal
          opened={historyOpen}
          onClose={() => setHistoryOpen(false)}
          workspaceId={editor.workspace.id}
          pageId={id}
          // A restore rewrites the page server-side, so the editor has to read
          // it back rather than keep the state it was holding.
          onRestored={() => window.location.reload()}
        />
      )} */}

      {editor.workspace && id && (
        <ContentPreviewModal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={editor.title}
          content={editor.content}
          src={pageService.previewUrl(editor.workspace.id, editor.slug)}
        />
      )}
    </Stack>
  );
}
