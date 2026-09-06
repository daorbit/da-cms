import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconCheck,
  IconCopy,
  IconArrowRight,
  IconPencil,
  IconWorld,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import { workspaceService } from "@/modules/workspace/workspaceService";
import type { Workspace } from "@/types";

const slugify = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Workspaces, led by the one being used.
 *
 * The active workspace gets a detail panel — its name, the id the content API
 * is addressed by, and where it publishes — because that is the one whose
 * settings someone came here to change. The rest are switch cards: enough to
 * recognise and move to, and nothing more.
 *
 * Name and site URL live here rather than under Settings, which is about the
 * account: these describe the workspace, and this is the screen that lists
 * workspaces.
 */
export function WorkspacesPage() {
  const navigate = useNavigate();
  const { workspaceSlug } = useParams();
  const { workspaces, refresh } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);

  // Falls back to the first, so the panel is still populated when this screen
  // is reached from outside a workspace.
  const active = workspaces.find((w) => w.slug === workspaceSlug) ?? workspaces[0];
  const others = workspaces.filter((w) => w.id !== active?.id);

  const enter = (w: Workspace) => navigate(`/${w.slug}/dashboard`);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Workspaces</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Every workspace you belong to, and how each one is set up.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
          New workspace
        </Button>
      </Group>

      {active && (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="lg">
            <div>
              <Group gap="xs" align="center">
                <Text fw={650} size="lg">
                  {active.name}
                </Text>
                <Tooltip label="Edit workspace" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label="Edit workspace"
                    onClick={() => setEditing(active)}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                </Tooltip>
                <Badge size="sm" variant="light" color="teal">
                  Active
                </Badge>
                {active.role && (
                  <Badge size="sm" variant="light" color="gray" tt="none">
                    {active.role}
                  </Badge>
                )}
              </Group>

              <WorkspaceId id={active.id} />
            </div>

            <Divider />

            <div>
              <SectionLabel icon={<IconWorld size={14} />}>Published site</SectionLabel>

              {active.websiteUrl ? (
                <Card withBorder radius="md" padding="sm" mt="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ThemeIcon variant="light" size="lg" radius="md">
                        <IconWorld size={17} />
                      </ThemeIcon>
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500}>
                          {active.slug}
                        </Text>
                        <Text
                          component="a"
                          href={active.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                          c="blue"
                          truncate
                        >
                          {active.websiteUrl}
                        </Text>
                      </div>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Edit site URL"
                      onClick={() => setEditing(active)}
                    >
                      <IconPencil size={15} />
                    </ActionIcon>
                  </Group>
                </Card>
              ) : (
                <Card withBorder radius="md" padding="md" mt="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" c="dimmed">
                      No site connected yet.
                    </Text>
                    <Button size="xs" variant="light" onClick={() => setEditing(active)}>
                      Add site URL
                    </Button>
                  </Group>
                </Card>
              )}
            </div>
          </Stack>
        </Card>
      )}

      {others.length > 0 && (
        <div>
          <SectionLabel icon={<IconLayoutGrid size={14} />}>Other workspaces</SectionLabel>

          <Box
            mt="sm"
            style={{
              display: "grid",
              gap: "var(--mantine-spacing-md)",
              gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
            }}
          >
            {others.map((w) => (
              <Card key={w.id} withBorder radius="md" padding="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text fw={600} truncate>
                      {w.name}
                    </Text>
                    {w.role && (
                      <Badge size="xs" variant="light" color="gray" tt="none">
                        {w.role}
                      </Badge>
                    )}
                  </Group>

                  <WorkspaceId id={w.id} />

                  <Button
                    variant="default"
                    mt="xs"
                    rightSection={<IconArrowRight size={15} />}
                    onClick={() => enter(w)}
                  >
                    Switch to workspace
                  </Button>
                </Stack>
              </Card>
            ))}
          </Box>
        </div>
      )}

      {workspaces.length === 0 && (
        <Card withBorder radius="md">
          <Stack align="center" gap="xs" py="lg">
            <Text fw={600}>No workspaces yet</Text>
            <Text c="dimmed" size="sm">
              Create one to start adding content.
            </Text>
            <Button
              mt="xs"
              leftSection={<IconPlus size={15} />}
              onClick={() => setCreateOpen(true)}
            >
              New workspace
            </Button>
          </Stack>
        </Card>
      )}

      <CreateWorkspaceModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (w) => {
          setCreateOpen(false);
          await refresh();
          navigate(`/${w.slug}/dashboard`);
        }}
      />

      <EditWorkspaceModal
        // Keyed so the fields reseed from the workspace each time it opens.
        key={editing?.id ?? "none"}
        workspace={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await refresh();
        }}
      />
    </Stack>
  );
}

/**
 * The id, shown rather than only copyable: it is what the content API is
 * addressed by, so someone wiring a site up needs to read it, not paste blind.
 */
function WorkspaceId({ id }: { id: string }) {
  return (
    <Group gap={6} mt={4} wrap="nowrap">
      <Text size="xs" c="dimmed">
        Workspace ID:
      </Text>
      <Text size="xs" c="dimmed" ff="monospace" truncate>
        {id}
      </Text>
      <CopyButton value={id}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copied" : "Copy workspace ID"} withArrow>
            <ActionIcon variant="subtle" color="gray" size="xs" onClick={copy}>
              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Group gap={6} c="dimmed">
      {icon}
      <Text size="xs" fw={600} tt="uppercase" style={{ letterSpacing: "0.04em" }}>
        {children}
      </Text>
    </Group>
  );
}

function CreateWorkspaceModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (w: Workspace) => void;
}) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = name.trim() ? null : "Give your workspace a name";
  const urlError =
    !websiteUrl.trim() || /^https?:\/\/\S+\.\S+/.test(websiteUrl.trim())
      ? null
      : "Enter a full URL, including https://";

  const submit = async () => {
    if (nameError || urlError) {
      setError(nameError ?? urlError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Workspace>("/workspaces", {
        name: name.trim(),
        websiteUrl: websiteUrl.trim(),
      });
      setName("");
      setWebsiteUrl("");
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New workspace" centered>
      <Stack>
        <TextInput
          label="Name"
          placeholder="Acme Inc."
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {name.trim() && (
          <Text size="xs" c="dimmed" ff="monospace" mt={-8}>
            /{slugify(name) || "workspace"}
          </Text>
        )}
        <TextInput
          label="Website URL"
          placeholder="https://yoursite.com (optional)"
          value={websiteUrl}
          error={error}
          onChange={(e) => setWebsiteUrl(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** A workspace's own settings — its name and where it publishes. */
function EditWorkspaceModal({
  workspace,
  onClose,
  onSaved,
}: {
  workspace: Workspace | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(workspace?.name ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(workspace?.websiteUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!workspace) return;
    setBusy(true);
    setError(null);
    try {
      await workspaceService.update(workspace.id, {
        name: name.trim() || workspace.name,
        websiteUrl: websiteUrl.trim(),
      });
      notifications.show({ message: "Workspace updated", color: "teal" });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={workspace !== null} onClose={onClose} title="Workspace settings" centered>
      <Stack>
        <TextInput
          label="Name"
          placeholder={workspace?.name}
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Text size="xs" c="dimmed" mt={-8}>
          The URL slug does not change when you rename.
        </Text>
        <TextInput
          label="Website URL"
          description="Where this workspace publishes."
          placeholder="https://example.com"
          value={websiteUrl}
          error={error}
          onChange={(e) => setWebsiteUrl(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
