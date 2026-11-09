import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Button, Menu, Skeleton, Text, Tooltip } from '@mantine/core';
import {
  IconAdjustments, IconArrowLeft, IconCopy, IconDeviceDesktop, IconDots, IconLink, IconPencil, IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ConfirmModal } from '@/components/ConfirmModal';
import { STATUS_LABEL, STATUS_ORDER, StatusLabel } from '@/components/StatusLabel';
import { ApiError } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { absoluteApiBase, pageService } from '@/modules/content/pageService';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import type { Page } from '@/types';
import { PageArticle } from './PageArticle';
import type { PageLibrary } from './usePageLibrary';
import classes from './PageLibrary.module.css';

interface Props {
  library: PageLibrary;
}

/** The detail pane: the selected page in full, with what you can do to it. */
export function PagePreviewPane({ library }: Props) {
  const navigate = useNavigate();
  const { workspace, selectedId, revision } = library;

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devicePreview, setDevicePreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!workspace || !selectedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    pageService
      .get(workspace.id, selectedId)
      .then((result) => !cancelled && setPage(result))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not open this page'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workspace, selectedId, revision]);

  const current = page?.id === selectedId ? page : null;

  if (!selectedId) {
    return (
      <section className={classes.previewPane} data-empty aria-label="Preview">
        <div className={classes.previewEmpty}>
          <Text fw={600}>Nothing selected</Text>
          <Text size="sm" c="dimmed">
            Choose a page to see it the way readers will.
          </Text>
        </div>
      </section>
    );
  }

  const copyApiUrl = async () => {
    if (!workspace || !current) return;
    await navigator.clipboard.writeText(
      `${absoluteApiBase().replace(/\/$/, '')}/workspaces/${workspace.id}/page-details/${current.slug}`
    );
    notifications.show({ message: 'Content API link copied' });
  };

  return (
    <section className={classes.previewPane} aria-label="Preview">
      <header className={classes.previewBar}>
        <ActionIcon
          variant="subtle"
          color="gray"
          className={classes.backButton}
          aria-label="Back to pages"
          onClick={() => library.select(null)}
        >
          <IconArrowLeft size={18} />
        </ActionIcon>

        <div className={classes.previewMeta}>
          {current && <StatusLabel status={current.status} />}
          {current && (
            <Text size="xs" c="dimmed" truncate>
              Edited {relativeTime(current.updatedAt)}
              {current.updatedBy?.name ? ` by ${current.updatedBy.name}` : ''}
            </Text>
          )}
        </div>

        <div className={classes.previewActions}>
          <Tooltip label="Preview on devices" withArrow>
            <ActionIcon variant="subtle" color="gray" aria-label="Preview on devices" disabled={!current} onClick={() => setDevicePreview(true)}>
              <IconDeviceDesktop size={17} stroke={1.7} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Details and SEO" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Details and SEO"
              onClick={() => navigate(library.detailsHref(selectedId))}
            >
              <IconAdjustments size={17} stroke={1.7} />
            </ActionIcon>
          </Tooltip>

          <Menu position="bottom-end" width={210}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="More actions" disabled={!current}>
                <IconDots size={17} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {current &&
                STATUS_ORDER.filter((status) => status !== current.status).map((status) => (
                  <Menu.Item key={status} onClick={() => library.setStatusFor([current.id], status)}>
                    {status === 'published' ? 'Publish' : `Move to ${STATUS_LABEL[status]}`}
                  </Menu.Item>
                ))}
              <Menu.Divider />
              <Menu.Item leftSection={<IconCopy size={15} />} onClick={() => current && library.duplicate(current)}>
                Duplicate
              </Menu.Item>
              {current?.status === 'published' && (
                <Menu.Item leftSection={<IconLink size={15} />} onClick={copyApiUrl}>
                  Copy content API link
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Button
            size="compact-sm"
            leftSection={<IconPencil size={14} />}
            onClick={() => navigate(library.editHref(selectedId))}
          >
            Edit
          </Button>
        </div>
      </header>

      <div className={classes.previewScroll}>
        {error ? (
          <div className={classes.previewEmpty}>
            <Text fw={600}>Couldn’t open this page</Text>
            <Text size="sm" c="dimmed">
              {error}
            </Text>
          </div>
        ) : loading && !current ? (
          <div className={classes.article}>
            <Skeleton height={260} radius={14} mb={28} />
            <Skeleton height={30} width="80%" radius="sm" mb={14} />
            <Skeleton height={16} width="60%" radius="sm" mb={32} />
            {Array.from({ length: 6 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} height={12} radius="sm" mb={12} width={i % 3 === 2 ? '70%' : '100%'} />
            ))}
          </div>
        ) : (
          current && <PageArticle page={current} />
        )}
      </div>

      {current && workspace && devicePreview && (
        <ContentPreviewModal
          opened
          onClose={() => setDevicePreview(false)}
          title={current.title}
          content={current.content}
          src={pageService.previewUrl(workspace.id, current.slug)}
        />
      )}

      <ConfirmModal
        opened={confirmDelete}
        title="Delete page"
        confirmLabel="Delete"
        busy={library.busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (current && (await library.deletePages([current.id]))) setConfirmDelete(false);
        }}
      >
        Delete <strong>{current?.title}</strong>? This can’t be undone.
      </ConfirmModal>
    </section>
  );
}
