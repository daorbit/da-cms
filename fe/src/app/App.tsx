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
import { CollectionListPage } from '@/modules/content/collections/CollectionListPage';
import { CollectionFormPage } from '@/modules/content/collections/CollectionFormPage';
import { ContentListPage } from '@/modules/content/collections/ContentListPage';
import { ContentEditorPage } from '@/modules/content/collections/ContentEditorPage';

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

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route element={<RequireWorkspace />}>
              <Route path="/:workspaceSlug" element={<WorkspaceLayout />}>
                {/* The workspace root has no page of its own — the dashboard is
                    the landing screen for a workspace. */}
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />

                <Route path="content">
                  <Route index element={<Navigate to="pages" replace />} />

                  <Route path="pages" element={<PageListPage />} />
                  <Route path="pages/new" element={<PageEditorPage />} />
                  <Route path="pages/:id/edit" element={<PageEditorPage />} />

                  <Route path="collections" element={<CollectionListPage />} />
                  <Route path="collections/new" element={<CollectionFormPage />} />
                  <Route path="collections/:collectionId/edit" element={<CollectionFormPage />} />
                  <Route path="collections/:collectionId/content" element={<ContentListPage />} />
                  <Route path="collections/:collectionId/content/new" element={<ContentEditorPage />} />
                  <Route path="collections/:collectionId/content/:id/edit" element={<ContentEditorPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
