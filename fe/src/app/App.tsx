import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireWorkspace } from '@/components/RequireWorkspace';
import { WorkspaceLayout } from '@/components/WorkspaceLayout';
import { SignupPage } from '@/pages/SignupPage';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { CollectionListPage } from '@/pages/CollectionListPage';
import { CollectionFormPage } from '@/pages/CollectionFormPage';
import { ContentListPage } from '@/pages/ContentListPage';
import { ContentEditorPage } from '@/pages/ContentEditorPage';

function HomeRedirect() {
  const { user, workspaces, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (workspaces.length === 0) return <Navigate to="/onboarding" replace />;
  return <Navigate to={`/${workspaces[0].slug}/collections`} replace />;
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
                <Route path="collections" element={<CollectionListPage />} />
                <Route path="collections/new" element={<CollectionFormPage />} />
                <Route path="collections/:collectionId/edit" element={<CollectionFormPage />} />
                <Route path="collections/:collectionId/content" element={<ContentListPage />} />
                <Route path="collections/:collectionId/content/new" element={<ContentEditorPage />} />
                <Route path="collections/:collectionId/content/:id/edit" element={<ContentEditorPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
