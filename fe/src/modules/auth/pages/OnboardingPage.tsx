import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, TextInput, Text } from '@mantine/core';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthBrand } from '@/modules/auth/components/AuthBrand';
import type { Workspace } from '@/types';

const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const nameError = name.trim() ? null : 'Give your workspace a name';
  const preview = slugify(name);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (nameError) return;

    setBusy(true);
    setError(null);
    try {
      const workspace = await api.post<Workspace>('/workspaces', { name: name.trim() });
      await refresh();
      navigate(`/${workspace.slug}/dashboard`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the workspace');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <AuthBrand
        headline="One workspace, all your content"
        subline="Group your pages and collections under a name your team will recognise."
      />

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <Stack gap="lg">
            <div>
              <h1 className="auth-title">Set up your workspace</h1>
              <p className="auth-subtitle">This is where your content lives. You can create more later.</p>
            </div>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            <Stack gap={8}>
              <TextInput
                placeholder="Acme Inc."
                size="md"
                autoFocus
                value={name}
                error={touched ? nameError : null}
                onChange={(e) => setName(e.currentTarget.value)}
                onBlur={() => setTouched(true)}
              />
              {/* The slug is derived, not asked for — showing it here means the
                  URL is never a surprise after the workspace is created. */}
              {preview && (
                <Text size="xs" c="dimmed" ff="monospace">
                  /{preview}
                </Text>
              )}
            </Stack>

            <Button type="submit" className="auth-submit" loading={busy} fullWidth size="md" radius="md">
              Create workspace
            </Button>
          </Stack>
        </form>
      </div>
    </div>
  );
}
