import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Text, Alert, Stack, Anchor, Group } from '@mantine/core';
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A field shows its error only once it has been left or the form submitted —
  // validating as someone types their first character is just nagging.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    firstName: firstName.trim() ? null : 'First name is required',
    email: /^\S+@\S+\.\S+$/.test(email) ? null : 'Enter a valid email',
    password: password.length >= 8 ? null : 'At least 8 characters',
  };

  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);
  const blur = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Reveal every error at once on submit, so nothing is discovered one field
    // at a time.
    setTouched({ firstName: true, email: true, password: true });
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
      <AuthBrand
        headline="Ship content without shipping code"
        subline="Create and publish pages in one workspace."
      />

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <Stack gap="lg">
            <div>
              <h1 className="auth-title">Create an account</h1>
              <p className="auth-subtitle">Start building in under two minutes.</p>
            </div>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            {/* The four fields are one block — spaced like the rest of the form
                they read as unrelated rows. */}
            <Stack gap={8}>
              <Group grow gap={8} align="flex-start" wrap="nowrap">
                <TextInput
                  placeholder="First name"
                  size="md"
                  autoComplete="given-name"
                  value={firstName}
                  error={show('firstName')}
                  onChange={(e) => setFirstName(e.currentTarget.value)}
                  onBlur={blur('firstName')}
                />
                <TextInput
                  placeholder="Last name"
                  size="md"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.currentTarget.value)}
                />
              </Group>

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
                placeholder="At least 8 characters"
                size="md"
                autoComplete="new-password"
                value={password}
                error={show('password')}
                onChange={(e) => setPassword(e.currentTarget.value)}
                onBlur={blur('password')}
              />
            </Stack>

            <Button type="submit" className="auth-submit" loading={busy} fullWidth size="md" radius="md">
              Create account
            </Button>

            <div className="auth-divider">or</div>

            <Text ta="center">
              <Anchor component={Link} to="/login" size="sm" underline="always" c="dimmed">
                Log in to an existing account
              </Anchor>
            </Text>
          </Stack>
        </form>
      </div>
    </div>
  );
}
