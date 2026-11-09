import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { absoluteApiBase } from '@/modules/content/pageService';
import { CreatePageModal } from '@/modules/content/pages/CreatePageModal';
import { PageIntegrationModal } from '@/modules/content/pages/PageIntegrationModal';
import { PageListPane } from './library/PageListPane';
import { PagePreviewPane } from './library/PagePreviewPane';
import { usePageLibrary } from './library/usePageLibrary';
import classes from './library/PageLibrary.module.css';

/**
 * The pages workspace: a list to find and act on pages beside a live preview of
 * the selected one, so content is browsed by seeing it rather than by rows.
 */
export function PageListPage() {
  const library = usePageLibrary();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 62em)');
  const [integrationOpen, setIntegrationOpen] = useState(false);

  const { pages, selectedId, select, loading } = library;
  useEffect(() => {
    if (wide && !loading && !selectedId && pages.length > 0) select(pages[0].id);
  }, [wide, loading, selectedId, pages, select]);

  return (
    <div className={classes.library} data-has-selection={selectedId ? true : undefined}>
      <PageListPane library={library} onOpenIntegration={() => setIntegrationOpen(true)} />
      <PagePreviewPane library={library} />

      <CreatePageModal
        opened={library.creating}
        onClose={() => library.setCreating(false)}
        onCreated={(created) => {
          library.setCreating(false);
          navigate(library.editHref(created.id));
        }}
      />

      {library.workspace && (
        <PageIntegrationModal
          opened={integrationOpen}
          onClose={() => setIntegrationOpen(false)}
          apiBase={absoluteApiBase()}
          workspaceId={library.workspace.id}
        />
      )}
    </div>
  );
}
