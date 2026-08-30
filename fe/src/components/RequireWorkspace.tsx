import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function RequireWorkspace() {
  const { workspaces, loading } = useAuth();

  if (loading) return null;
  if (workspaces.length === 0) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
