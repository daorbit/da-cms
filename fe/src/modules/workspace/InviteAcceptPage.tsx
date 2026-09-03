import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Alert, Button, Card, Center, Group, Loader, Stack, Text, Title,
} from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { invitationService, type InvitePreview } from '@/modules/workspace/workspaceService';

/**
 * Landing screen for an emailed invite link (`/invite/:token`). Shows the
 * workspace + role, then either accepts (signed in) or routes to login with a
 * return path. Handles the "invite was sent to a different address" case with
 * an explicit force-accept.
 */
export function InviteAcceptPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refresh } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    invitationService
      .preview(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'This invite is not valid'))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async (force = false) => {
    setBusy(true);
    setError(null);
    try {
      const { workspace } = await invitationService.accept(token, force);
      await refresh();
      navigate(workspace ? `/${workspace.slug}/dashboard` : '/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'email_mismatch') {
        setMismatch(true);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not accept the invite');
      }
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await invitationService.decline(token);
    } catch {
      /* declining a gone invite is fine */
    }
    navigate('/');
  };

  if (loading || authLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Center h="100vh" p="md">
      <Card withBorder radius="lg" p="xl" maw={420} w="100%">
        <Stack>
          <Title order={3}>Workspace invite</Title>

          {error && (
            <Alert color={mismatch ? 'yellow' : 'red'} variant="light">
              {error}
            </Alert>
          )}

          {preview && (
            <Text>
              You&apos;ve been invited to join{' '}
              <strong>{preview.workspace?.name ?? 'a workspace'}</strong> as{' '}
              <strong>{preview.role}</strong>, at <strong>{preview.email}</strong>.
            </Text>
          )}

          {!user ? (
            <>
              <Text c="dimmed" size="sm">
                Sign in with {preview?.email ?? 'the invited address'} to accept.
              </Text>
              <Button component={Link} to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
                Sign in to accept
              </Button>
              <Button
                component={Link}
                variant="subtle"
                to={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
              >
                Create an account
              </Button>
            </>
          ) : mismatch ? (
            <Group>
              <Button variant="default" onClick={decline}>
                Cancel
              </Button>
              <Button color="yellow" onClick={() => accept(true)} loading={busy}>
                Accept with {user.email}
              </Button>
            </Group>
          ) : (
            <Group>
              <Button variant="subtle" color="gray" onClick={decline} disabled={busy}>
                Decline
              </Button>
              <Button onClick={() => accept(false)} loading={busy} disabled={!preview}>
                Accept invite
              </Button>
            </Group>
          )}
        </Stack>
      </Card>
    </Center>
  );
}
