import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireWorkspace } from '@/components/RequireWorkspace';
import { WorkspaceLayout } from '@/modules/layout/WorkspaceLayout';
import { SignupPage } from '@/modules/auth/pages/SignupPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { OnboardingPage } from '@/modules/auth/pages/OnboardingPage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { PageListPage } from '@/modules/content/pages/PageListPage';
import { PageEditorPage } from '@/modules/content/pages/PageEditorPage';
import { SettingsPage } from '@/modules/workspace/SettingsPage';
import { TeamsPage } from '@/modules/workspace/TeamsPage';
import { InviteAcceptPage } from '@/modules/workspace/InviteAcceptPage';
import { WorkspacesPage } from '@/modules/workspace/WorkspacesPage';

function HomeRedirect() {
  const { user, workspaces, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (workspaces.length === 0) return <Navigate to="/onboarding" replace />;
  return <Navigate to={`/${workspaces[0].slug}/dashboard`} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />

            <Route element={<RequireWorkspace />}>
              <Route path="/:workspaceSlug" element={<WorkspaceLayout />}>
                {/* The workspace root has no page of its own — the dashboard is
                    the landing screen for a workspace. */}
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />

                <Route path="content">
                  <Route index element={<Navigate to="pages" replace />} />

                  {/* No "new" route: a page is created through a dialog on the
                      list, so the editor always has a real page to open. */}
                  <Route path="pages" element={<PageListPage />} />
                  <Route path="pages/:id/edit" element={<PageEditorPage />} />
                </Route>

                <Route path="teams" element={<TeamsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
