import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { PageSkeleton } from '@/components/Skeletons';

export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
