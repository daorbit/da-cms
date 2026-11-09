import { useState } from 'react';
import {
  ActionIcon, Button, Checkbox, Menu, SegmentedControl, Select, Skeleton, Text, TextInput, Tooltip,
} from '@mantine/core';
import {
  IconChevronLeft, IconChevronRight, IconCode, IconPlus, IconRefresh, IconSearch, IconTrash,
} from '@tabler/icons-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { STATUS_LABEL, STATUS_ORDER } from '@/components/StatusLabel';
import { plural } from '@/lib/format';
import { PER_PAGE, type PageLibrary, type StatusFilter } from './usePageLibrary';
import { PageRow } from './PageRow';
import classes from './PageLibrary.module.css';

interface Props {
  library: PageLibrary;
  onOpenIntegration: () => void;
}

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  ...STATUS_ORDER.map((status) => ({ label: STATUS_LABEL[status], value: status })),
];

/** The middle pane: find a page, act on several, and pick one to preview. */
export function PageListPane({ library, onOpenIntegration }: Props) {
  const { filters, pages, checked } = library;
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const selecting = checked.size > 0;
  const rangeStart = library.total === 0 ? 0 : (library.page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(library.page * PER_PAGE, library.total);

  return (
    <section className={classes.listPane} aria-label="Pages">
      <header className={classes.listHeader}>
        {selecting ? (
          <div className={classes.bulkBar}>
            <Checkbox
              size="xs"
              radius="sm"
              aria-label="Select all on this page"
              checked={library.allChecked}
              indeterminate={!library.allChecked}
              onChange={library.toggleAll}
            />
            <Text size="sm" fw={600} className={classes.bulkCount}>
              {checked.size} selected
            </Text>
            <Menu position="bottom-end" width={180}>
              <Menu.Target>
                <Button size="compact-sm" variant="default" loading={library.busy}>
                  Move to
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {STATUS_ORDER.map((status) => (
                  <Menu.Item
                    key={status}
                    onClick={async () => {
                      await library.setStatusFor([...checked], status);
                      library.clearChecked();
                    }}
                  >
                    {STATUS_LABEL[status]}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            <Tooltip label="Delete" withArrow>
              <ActionIcon variant="subtle" color="red" aria-label="Delete selected" onClick={() => setConfirmBulkDelete(true)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
            <Button size="compact-sm" variant="subtle" color="gray" onClick={library.clearChecked}>
              Done
            </Button>
          </div>
        ) : (
          <div className={classes.titleRow}>
            <div>
              <h1 className={classes.paneTitle}>Pages</h1>
              <Text size="xs" c="dimmed">
                {library.loading && library.total === 0 ? 'Loading…' : plural(library.total, 'page')}
              </Text>
            </div>
            <div className={classes.titleActions}>
              <Tooltip label="Refresh" withArrow>
                <ActionIcon variant="subtle" color="gray" aria-label="Refresh" loading={library.loading} onClick={library.refresh}>
                  <IconRefresh size={17} stroke={1.7} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Use in your site" withArrow>
                <ActionIcon variant="subtle" color="gray" aria-label="Use in your site" onClick={onOpenIntegration}>
                  <IconCode size={17} stroke={1.7} />
                </ActionIcon>
              </Tooltip>
              <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => library.setCreating(true)}>
                New
              </Button>
            </div>
          </div>
        )}

        <TextInput
          size="sm"
          placeholder="Search title or slug"
          aria-label="Search pages"
          leftSection={<IconSearch size={15} />}
          value={filters.search}
          onChange={(e) => filters.setSearch(e.currentTarget.value)}
        />

        <div className={classes.filterRow}>
          <SegmentedControl
            size="xs"
            fullWidth
            className={classes.statusFilter}
            value={filters.status}
            onChange={(value) => filters.setStatus(value as StatusFilter)}
            data={STATUS_FILTERS}
          />
          {filters.groups.length > 0 && (
            <Select
              size="xs"
              placeholder="All groups"
              aria-label="Filter by group"
              clearable
              value={filters.group}
              onChange={filters.setGroup}
              data={filters.groups}
              className={classes.groupFilter}
            />
          )}
        </div>
      </header>

      <div className={classes.listScroll}>
        {library.error && (
          <Text size="sm" c="red" p="md">
            {library.error}
          </Text>
        )}

        {library.loading && pages.length === 0 ? (
          <div className={classes.rows}>
            {Array.from({ length: 8 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className={classes.skeletonRow}>
                <Skeleton width={44} height={44} radius={10} />
                <div className={classes.skeletonText}>
                  <Skeleton height={12} width="70%" radius="sm" />
                  <Skeleton height={10} width="45%" radius="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className={classes.listEmpty}>
            <Text fw={600} size="sm">
              {filters.filtered ? 'No matches' : 'No pages yet'}
            </Text>
            <Text size="sm" c="dimmed">
              {filters.filtered ? 'Try another search or filter.' : 'Write your first page, or ask Claude to draft one.'}
            </Text>
            {!filters.filtered && (
              <Button size="xs" mt="xs" leftSection={<IconPlus size={14} />} onClick={() => library.setCreating(true)}>
                New page
              </Button>
            )}
          </div>
        ) : (
          <div className={classes.rows}>
            {pages.map((p) => (
              <PageRow
                key={p.id}
                page={p}
                active={p.id === library.selectedId}
                checked={checked.has(p.id)}
                selecting={selecting}
                onOpen={() => library.select(p.id)}
                onToggleChecked={() => library.toggleChecked(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {library.totalPages > 1 && (
        <footer className={classes.listFooter}>
          <Text size="xs" c="dimmed">
            {rangeStart}–{rangeEnd} of {library.total}
          </Text>
          <div className={classes.pager}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Previous page"
              disabled={library.page <= 1}
              onClick={() => library.setPage(library.page - 1)}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Next page"
              disabled={library.page >= library.totalPages}
              onClick={() => library.setPage(library.page + 1)}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </div>
        </footer>
      )}

      <ConfirmModal
        opened={confirmBulkDelete}
        title="Delete pages"
        confirmLabel="Delete"
        busy={library.busy}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={async () => {
          if (await library.deletePages([...checked])) setConfirmBulkDelete(false);
        }}
      >
        Delete <strong>{plural(checked.size, 'page')}</strong>? This can’t be undone.
      </ConfirmModal>
    </section>
  );
}
