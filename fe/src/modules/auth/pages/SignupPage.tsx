import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TextInput, PasswordInput, Button, Title, Text, Alert, Stack, Anchor, Group,
} from '@mantine/core';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthBrand } from '@/modules/auth/components/AuthBrand';
import type { User } from '@/types';

export function SignupPage() {
  const navigate = useNavigate();
  const { setSession, refresh } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A field shows its error only once it has been left or the form submitted —
  // validating as someone types their first character is just nagging.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    firstName: firstName.trim() ? null : 'First name is required',
    lastName: null,
    email: /^\S+@\S+\.\S+$/.test(email) ? null : 'Enter a valid email',
    password: password.length >= 8 ? null : 'At least 8 characters',
    confirm: confirm === password ? null : 'Passwords do not match',
  };

  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);
  const blur = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Reveal every error at once on submit, so nothing is discovered one field
    // at a time.
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirm: true });
    if (Object.values(errors).some(Boolean)) return;

    setBusy(true);
    setError(null);
    try {
      // The API takes a single `name`, so the split fields are joined here.
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await api.post<{ user: User }>('/auth/signup', {
        name,
        email: email.trim(),
        password,
      });
      setSession(res.user);
      await refresh();
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.');
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
              <Title order={2}>Create your account</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Start building in under two minutes.
              </Text>
            </div>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            <Group grow align="flex-start" gap="sm">
              <TextInput
                label="First name"
                placeholder="Ada"
                size="md"
                withAsterisk
                autoComplete="given-name"
                value={firstName}
                error={show('firstName')}
                onChange={(e) => setFirstName(e.currentTarget.value)}
                onBlur={blur('firstName')}
              />
              <TextInput
                label="Last name"
                placeholder="Lovelace"
                size="md"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.currentTarget.value)}
              />
            </Group>

            <TextInput
              label="Work email"
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
              placeholder="At least 8 characters"
              size="md"
              withAsterisk
              autoComplete="new-password"
              value={password}
              error={show('password')}
              onChange={(e) => setPassword(e.currentTarget.value)}
              onBlur={blur('password')}
            />

            <PasswordInput
              label="Confirm password"
              placeholder="Re-enter your password"
              size="md"
              withAsterisk
              autoComplete="new-password"
              value={confirm}
              error={show('confirm')}
              onChange={(e) => setConfirm(e.currentTarget.value)}
              onBlur={blur('confirm')}
            />

            <Button type="submit" loading={busy} fullWidth size="md">
              Create account
            </Button>

            <Text c="dimmed" size="sm" ta="center">
              Have an account?{' '}
              <Anchor component={Link} to="/login" fw={600}>
                Log in
              </Anchor>
            </Text>
          </Stack>
        </form>
      </div>
    </div>
  );
}
