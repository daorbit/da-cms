import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Container, Paper, PasswordInput, Stack, TextInput, Title, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

export function SignupPage() {
  const navigate = useNavigate();
  const { setSession, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { name: '', email: '', password: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Name is required' : null),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
      password: (v) => (v.length >= 8 ? null : 'At least 8 characters'),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ user: User }>('/auth/signup', values);
      setSession(res.user);
      await refresh();
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Container size={420} py={80}>
      <Title order={2} ta="center">
        Create your account
      </Title>
      <Paper withBorder shadow="sm" p="lg" mt="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <TextInput label="Name" placeholder="Ada Lovelace" {...form.getInputProps('name')} />
            <TextInput label="Email" placeholder="you@example.com" {...form.getInputProps('email')} />
            <PasswordInput label="Password" placeholder="At least 8 characters" {...form.getInputProps('password')} />
            <Button type="submit" loading={submitting} fullWidth>
              Sign up
            </Button>
          </Stack>
        </form>
      </Paper>
      <Text ta="center" mt="md" size="sm">
        Already have an account? <Link to="/login">Log in</Link>
      </Text>
    </Container>
  );
}
