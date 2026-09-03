import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Text, Alert, Stack, Anchor, Group } from '@mantine/core';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthBrand } from '@/modules/auth/components/AuthBrand';
import type { User } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Where to land after a successful sign-in — set by the invite-accept screen
  // so an invited user comes straight back to the invite.
  const next = params.get('next');
  const { setSession, refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A field shows its error only once it has been left or the form submitted —
  // validating as someone types their first character is just nagging.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    email: /^\S+@\S+\.\S+$/.test(email) ? null : 'Enter a valid email',
    // Presence only. Signup's strength rules must not apply here: an older
    // account may have a shorter password, and refusing it would lock the
    // owner out of a working account.
    password: password ? null : 'Password is required',
  };

  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);
  const blur = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (Object.values(errors).some(Boolean)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/auth/login', {
        email: email.trim(),
        password,
      });
      setSession(res.user);
      await refresh();
      navigate(next && next.startsWith('/') ? next : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <AuthBrand
        headline="Ship content without shipping code"
        subline="Create and publish pages in one workspace."
      />

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <Stack gap="lg">
            <div>
              <h1 className="auth-title">Log in</h1>
              <p className="auth-subtitle">Welcome back to your workspace.</p>
            </div>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            {/* The two fields and the recovery link are one block: spaced like
                the rest of the form they read as three unrelated rows. */}
            <Stack gap={8}>
              <TextInput
                type="email"
                placeholder="you@example.com"
                size="md"
                autoComplete="email"
                value={email}
                error={show('email')}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onBlur={blur('email')}
              />
              <PasswordInput
                placeholder="••••••••"
                size="md"
                autoComplete="current-password"
                value={password}
                error={show('password')}
                onChange={(e) => setPassword(e.currentTarget.value)}
                onBlur={blur('password')}
              />

              {/* No "remember me": the session cookie's lifetime is set server
                  side, so a checkbox here would control nothing. */}
              <Group justify="flex-end" mt={2}>
                <Anchor component={Link} to="/forgot-password" size="xs" c="dimmed" underline="always">
                  Forgot password?
                </Anchor>
              </Group>
            </Stack>

            <Button type="submit" className="auth-submit" loading={busy} fullWidth size="md" radius="md">
              Log in
            </Button>

            <div className="auth-divider">or</div>

            <Text ta="center">
              <Anchor component={Link} to="/signup" size="sm" underline="always" c="dimmed">
                Create an account
              </Anchor>
            </Text>
          </Stack>
        </form>
      </div>
    </div>
  );
}
