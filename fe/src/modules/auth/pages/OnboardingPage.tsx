import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Group, Select, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconCheck, IconArrowLeft, IconArrowRight, IconFileText, IconStack2 } from '@tabler/icons-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthBrand, type BrandStep } from '@/modules/auth/components/AuthBrand';
import type { Workspace } from '@/types';

const STEPS: BrandStep[] = [
  { label: 'About you', description: 'So the workspace fits how you work.' },
  { label: 'Your workspace', description: 'Name it and point it at your site.' },
  { label: "You're all set", description: 'Start building.' },
];

const JOB_ROLES = ['Developer', 'Designer', 'Marketer', 'Content writer', 'Founder', 'Other'];
const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'];

const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [jobRole, setJobRole] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState<string | null>(null);

  // Step 2
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  // Step 3 — kept so the final screen can name the workspace and link into it.
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const nameError = name.trim() ? null : 'Give your workspace a name';
  const urlError =
    !websiteUrl.trim() || /^https?:\/\/\S+\.\S+/.test(websiteUrl.trim())
      ? null
      : 'Enter a full URL, including https://';

  /** Step 1 is skippable, so its answers are saved on a best-effort basis. */
  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.patch('/auth/profile', { jobRole: jobRole ?? '', teamSize: teamSize ?? '' });
      setStep(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your details');
    } finally {
      setBusy(false);
    }
  };

  const createWorkspace = async () => {
    setNameTouched(true);
    if (nameError || urlError) return;

    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Workspace>('/workspaces', {
        name: name.trim(),
        websiteUrl: websiteUrl.trim(),
      });
      // Closes the flow for good: `onboardedAt` is what keeps a returning user
      // from being sent back through it.
      await api.patch('/auth/profile', { onboarded: true });
      await refresh();
      setWorkspace(created);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the workspace');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <AuthBrand
        headline="Let's get your workspace ready"
        subline="Three short steps, and you can change any of it later."
        steps={STEPS}
        current={step}
      />

      <div className="auth-panel">
        <div className="auth-form">
          <Stack gap="lg">
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            {step === 0 && (
              <>
                <div>
                  <h1 className="auth-title">About you</h1>
                  <p className="auth-subtitle">This only shapes a few defaults. Skip it if you like.</p>
                </div>

                <Stack gap={8}>
                  <Select
                    placeholder="What do you do?"
                    size="md"
                    data={JOB_ROLES}
                    value={jobRole}
                    onChange={setJobRole}
                    comboboxProps={{ withinPortal: true }}
                  />
                  <Select
                    placeholder="How big is your team?"
                    size="md"
                    data={TEAM_SIZES}
                    value={teamSize}
                    onChange={setTeamSize}
                    comboboxProps={{ withinPortal: true }}
                  />
                </Stack>

                <Button
                  className="auth-submit"
                  loading={busy}
                  fullWidth
                  size="md"
                  radius="md"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={saveProfile}
                >
                  Continue
                </Button>

                <Text ta="center">
                  <Text
                    component="button"
                    type="button"
                    size="sm"
                    c="dimmed"
                    td="underline"
                    style={{ background: 'none', border: 0, cursor: 'pointer' }}
                    onClick={() => setStep(1)}
                  >
                    Skip for now
                  </Text>
                </Text>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <h1 className="auth-title">Your workspace</h1>
                  <p className="auth-subtitle">This is where your content lives. You can create more later.</p>
                </div>

                <Stack gap={8}>
                  <TextInput
                    placeholder="Acme Inc."
                    size="md"
                    autoFocus
                    value={name}
                    error={nameTouched ? nameError : null}
                    onChange={(e) => setName(e.currentTarget.value)}
                    onBlur={() => setNameTouched(true)}
                  />
                  {/* The slug is derived, not asked for — showing it means the
                      URL is never a surprise after the workspace is created. */}
                  {name.trim() && (
                    <Text size="xs" c="dimmed" ff="monospace">
                      /{slugify(name) || 'workspace'}
                    </Text>
                  )}
                  <TextInput
                    placeholder="https://yoursite.com (optional)"
                    size="md"
                    value={websiteUrl}
                    error={urlError}
                    onChange={(e) => setWebsiteUrl(e.currentTarget.value)}
                  />
                </Stack>

                <Group grow gap="xs">
                  <Button
                    variant="default"
                    size="md"
                    radius="md"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => setStep(0)}
                  >
                    Back
                  </Button>
                  <Button
                    className="auth-submit"
                    loading={busy}
                    size="md"
                    radius="md"
                    onClick={createWorkspace}
                  >
                    Create workspace
                  </Button>
                </Group>
              </>
            )}

            {step === 2 && workspace && (
              <>
                <Stack align="center" gap="xs">
                  <ThemeIcon size={52} radius="xl" variant="light" color="teal">
                    <IconCheck size={26} />
                  </ThemeIcon>
                  <h1 className="auth-title">You're all set</h1>
                  <p className="auth-subtitle">
                    <strong>{workspace.name}</strong> is ready. Here's where to start.
                  </p>
                </Stack>

                <Stack gap={8}>
                  <Button
                    className="auth-submit"
                    fullWidth
                    size="md"
                    radius="md"
                    leftSection={<IconFileText size={16} />}
                    onClick={() => navigate(`/${workspace.slug}/content/pages?new=1`)}
                  >
                    Create your first page
                  </Button>
                  <Button
                    variant="default"
                    fullWidth
                    size="md"
                    radius="md"
                    leftSection={<IconStack2 size={16} />}
                    onClick={() => navigate(`/${workspace.slug}/dashboard`)}
                  >
                    Go to the dashboard
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </div>
      </div>
    </div>
  );
}
