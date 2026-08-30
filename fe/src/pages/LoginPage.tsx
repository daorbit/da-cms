import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Container, Paper, PasswordInput, Stack, TextInput, Title, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
      password: (v) => (v.length === 0 ? 'Password is required' : null),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ user: User }>('/auth/login', values);
      setSession(res.user);
      await refresh();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Container size={420} py={80}>
      <Title order={2} ta="center">
        Log in
      </Title>
      <Paper withBorder shadow="sm" p="lg" mt="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <TextInput label="Email" placeholder="you@example.com" {...form.getInputProps('email')} />
            <PasswordInput label="Password" {...form.getInputProps('password')} />
            <Button type="submit" loading={submitting} fullWidth>
              Log in
            </Button>
          </Stack>
        </form>
      </Paper>
      <Text ta="center" mt="md" size="sm">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </Text>
    </Container>
  );
}
