import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TextInput, PasswordInput, Button, Title, Text, Alert, Stack, Anchor,
} from '@mantine/core';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthBrand } from '@/modules/auth/components/AuthBrand';
import type { User } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
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
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <AuthBrand />
      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <Stack gap="lg">
            <div>
              <Title order={2}>Welcome back</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Log in to your workspace.
              </Text>
            </div>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            <TextInput
              label="Email"
              type="email"
              placeholder="you@company.com"
              size="md"
              withAsterisk
              autoComplete="email"
              value={email}
              error={show('email')}
              onChange={(e) => setEmail(e.currentTarget.value)}
              onBlur={blur('email')}
            />

            <PasswordInput
              label="Password"
              placeholder="••••••••"
              size="md"
              withAsterisk
              autoComplete="current-password"
              value={password}
              error={show('password')}
              onChange={(e) => setPassword(e.currentTarget.value)}
              onBlur={blur('password')}
            />

            <Button type="submit" loading={busy} fullWidth size="md">
              Log in
            </Button>

            <Text c="dimmed" size="sm" ta="center">
              No account?{' '}
              <Anchor component={Link} to="/signup" fw={600}>
                Sign up free
              </Anchor>
            </Text>
          </Stack>
        </form>
      </div>
    </div>
  );
}
