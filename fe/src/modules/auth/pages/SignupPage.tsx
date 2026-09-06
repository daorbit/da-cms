import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  TextInput, PasswordInput, PinInput, Button, Text, Alert, Stack, Anchor, Group, Center,
} from '@mantine/core';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthBrand } from '@/modules/auth/components/AuthBrand';
import type { User } from '@/types';

export function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // An invited user signs up, then goes straight to the invite to accept it
  // rather than through onboarding (they're joining an existing workspace).
  const next = params.get('next');
  const { setSession, refresh } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Signup is two stages in one panel: the details, then the code that proves
  // the address is the requester's. The account exists only after the second.
  const [stage, setStage] = useState<'details' | 'code'>('details');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Counts the resend cooldown down so the button says when it is usable again
  // rather than just refusing.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

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
      await api.post('/auth/signup', { name, email: email.trim(), password });
      // No session yet — the account is not created until the code comes back.
      setStage('code');
      setNotice(`We sent a code to ${email.trim()}.`);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const enter = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/auth/signup/verify', {
        email: email.trim(),
        code: value,
      });
      setSession(res.user);
      await refresh();
      navigate(next && next.startsWith('/') ? next : '/onboarding');
    } catch (err) {
      setCode('');
      setError(err instanceof ApiError ? err.message : 'Could not verify that code.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError('Enter the six-digit code from your email');
      return;
    }
    await enter(code);
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/auth/signup/resend', { email: email.trim() });
      setNotice('We sent another code.');
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send another code.');
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
        {stage === 'code' ? (
          <form className="auth-form" onSubmit={verify} noValidate>
            <Stack gap="lg">
              <div>
                <h1 className="auth-title">Check your email</h1>
                <p className="auth-subtitle">
                  Enter the six-digit code we sent to {email.trim()}.
                </p>
              </div>

              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}

              {!error && notice && (
                <Alert color="blue" variant="light">
                  {notice}
                </Alert>
              )}

              <Center>
                <PinInput
                  length={6}
                  type="number"
                  inputMode="numeric"
                  oneTimeCode
                  autoFocus
                  size="md"
                  value={code}
                  onChange={setCode}
                  // Submits itself on the last digit: with a fixed-length code
                  // there is nothing left to decide once it is filled in.
                  onComplete={enter}
                  aria-label="Verification code"
                />
              </Center>

              <Button
                type="submit"
                className="auth-submit"
                loading={busy}
                fullWidth
                size="md"
                radius="md"
              >
                Verify and continue
              </Button>

              <Group justify="center" gap="xs">
                <Text size="sm" c="dimmed">
                  Didn't get it?
                </Text>
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  underline="always"
                  c={cooldown > 0 ? 'dimmed' : undefined}
                  onClick={resend}
                  disabled={busy || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send another code'}
                </Anchor>
              </Group>

              <Text ta="center">
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  underline="always"
                  c="dimmed"
                  onClick={() => {
                    setStage('details');
                    setCode('');
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Use a different email
                </Anchor>
              </Text>
            </Stack>
          </form>
        ) : (
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
        )}
      </div>
    </div>
  );
}
