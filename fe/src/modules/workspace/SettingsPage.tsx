import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Center, Loader, Stack, Tabs, Text, Title } from '@mantine/core';
import {
  IconAdjustments, IconUsers, IconCategory, IconTags, IconLink,
} from '@tabler/icons-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ApiError } from '@/lib/api';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { WorkspaceSettings } from '@/types';
import { GeneralTab } from './settings/GeneralTab';
import { MembersTab } from './settings/MembersTab';
import { TermsTab } from './settings/TermsTab';
import { SiteLinksTab } from './settings/SiteLinksTab';

const TABS = ['general', 'members', 'groups', 'tags', 'links'] as const;
type TabValue = (typeof TABS)[number];

/**
 * Workspace configuration, one screen with tabs. Taxonomy (groups, tags) and
 * site links live here rather than on the page editor so the whole workspace
 * shares one source of truth.
 */
export function SettingsPage() {
  const workspace = useWorkspace();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabValue) ?? 'general';

  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = workspace?.role === 'owner' || workspace?.role === 'admin';

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    workspaceService
      .settings(workspace.id)
      .then((s) => !cancelled && setSettings(s))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load settings'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const setTab = (value: string | null) => {
    if (!value) return;
    params.set('tab', value);
    setParams(params, { replace: true });
  };

  if (!workspace) return null;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Settings</Title>
        <Text c="dimmed" size="sm" mt={4}>
          Manage this workspace, its team, and how pages are organised.
        </Text>
      </div>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconAdjustments size={15} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="members" leftSection={<IconUsers size={15} />}>
            Members
          </Tabs.Tab>
          <Tabs.Tab value="groups" leftSection={<IconCategory size={15} />}>
            Groups
          </Tabs.Tab>
          <Tabs.Tab value="tags" leftSection={<IconTags size={15} />}>
            Tags
          </Tabs.Tab>
          <Tabs.Tab value="links" leftSection={<IconLink size={15} />}>
            Site links
          </Tabs.Tab>
        </Tabs.List>

        <div style={{ paddingTop: 'var(--mantine-spacing-lg)' }}>
          {loading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : (
            <>
              <Tabs.Panel value="general">
                <GeneralTab workspace={workspace} canManage={canManage} />
              </Tabs.Panel>

              <Tabs.Panel value="members">
                <MembersTab workspace={workspace} canManage={canManage} />
              </Tabs.Panel>

              <Tabs.Panel value="groups">
                <TermsTab
                  kind="group"
                  workspaceId={workspace.id}
                  terms={settings?.configuration.groups ?? []}
                  canManage={canManage}
                  onSaved={(s) => setSettings(s)}
                />
              </Tabs.Panel>

              <Tabs.Panel value="tags">
                <TermsTab
                  kind="tag"
                  workspaceId={workspace.id}
                  terms={settings?.configuration.tags ?? []}
                  canManage={canManage}
                  onSaved={(s) => setSettings(s)}
                />
              </Tabs.Panel>

              <Tabs.Panel value="links">
                <SiteLinksTab
                  workspaceId={workspace.id}
                  links={settings?.siteLinks ?? []}
                  canManage={canManage}
                  onSaved={(s) => setSettings(s)}
                />
              </Tabs.Panel>
            </>
          )}
        </div>
      </Tabs>
    </Stack>
  );
}
