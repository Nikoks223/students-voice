import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// ── Eager — common-path pages (no lazy penalty on first navigation) ──
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Forum from './pages/Forum';
import Thread from './pages/Thread';
import Search from './pages/Search';
import RecentComments from './pages/RecentComments';

// ── Lazy — heavy or rarely-visited pages ──
const NewThread = lazy(() => import('./pages/NewThread'));
const AdminShell = lazy(() => import('./components/admin/AdminShell'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const ResolvedPage = lazy(() => import('./pages/admin/ResolvedPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const ForumsPage = lazy(() => import('./pages/admin/ForumsPage'));
const SuggestionsPage = lazy(() => import('./pages/admin/SuggestionsPage'));
const StatsPage = lazy(() => import('./pages/admin/StatsPage'));
const AdminsPage = lazy(() => import('./pages/admin/AdminsPage'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Saved = lazy(() => import('./pages/Saved'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const SuggestForum = lazy(() => import('./pages/SuggestForum'));
const Profile = lazy(() => import('./pages/Profile'));
const FollowersList = lazy(() => import('./pages/FollowersList'));
const FollowingList = lazy(() => import('./pages/FollowingList'));
const Guidelines = lazy(() => import('./pages/Guidelines'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageShimmer() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-12 w-full rounded-2xl" />
      <div className="shimmer h-64 w-full rounded-2xl" />
      <div className="shimmer h-32 w-full rounded-2xl" />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth — no layout */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute requireProfile={false}>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* App — with MainLayout, eager (common path) */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/p/:forumId/:threadId"
          element={
            <MainLayout>
              <Thread />
            </MainLayout>
          }
        />
        <Route
          path="/p/:forumId"
          element={
            <MainLayout>
              <Forum />
            </MainLayout>
          }
        />
        <Route
          path="/recent"
          element={
            <MainLayout>
              <RecentComments />
            </MainLayout>
          }
        />
        <Route
          path="/search"
          element={
            <MainLayout>
              <Search />
            </MainLayout>
          }
        />

        {/* App — lazy (rarely visited or heavy) */}
        <Route
          path="/new"
          element={
            <MainLayout>
              <ProtectedRoute requireProfile={true}>
                <Suspense fallback={<PageShimmer />}>
                  <NewThread />
                </Suspense>
              </ProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/suggest-forum"
          element={
            <MainLayout>
              <ProtectedRoute requireProfile={true}>
                <Suspense fallback={<PageShimmer />}>
                  <SuggestForum />
                </Suspense>
              </ProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/notifications"
          element={
            <MainLayout>
              <ProtectedRoute requireProfile={true}>
                <Suspense fallback={<PageShimmer />}>
                  <Notifications />
                </Suspense>
              </ProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <MainLayout>
              <ProtectedRoute requireProfile={true}>
                <Suspense fallback={<PageShimmer />}>
                  <Settings />
                </Suspense>
              </ProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/saved"
          element={
            <MainLayout>
              <ProtectedRoute requireProfile={true}>
                <Suspense fallback={<PageShimmer />}>
                  <Saved />
                </Suspense>
              </ProtectedRoute>
            </MainLayout>
          }
        />
        {/* ── Admin panel — nested routes share AdminShell layout ── */}
        <Route
          path="/admin"
          element={
            <MainLayout>
              <ProtectedRoute adminOnly={true}>
                <Suspense fallback={<PageShimmer />}>
                  <AdminShell />
                </Suspense>
              </ProtectedRoute>
            </MainLayout>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageShimmer />}>
                <AdminOverview />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageShimmer />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route
            path="reports/resolved"
            element={
              <Suspense fallback={<PageShimmer />}>
                <ResolvedPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageShimmer />}>
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="forums"
            element={
              <Suspense fallback={<PageShimmer />}>
                <ForumsPage />
              </Suspense>
            }
          />
          <Route
            path="suggestions"
            element={
              <Suspense fallback={<PageShimmer />}>
                <SuggestionsPage />
              </Suspense>
            }
          />
          <Route
            path="stats"
            element={
              <Suspense fallback={<PageShimmer />}>
                <StatsPage />
              </Suspense>
            }
          />
          <Route
            path="admins"
            element={
              <Suspense fallback={<PageShimmer />}>
                <AdminsPage />
              </Suspense>
            }
          />
        </Route>
   
        {/* Leaderboard — public, no auth */}
        <Route
          path="/leaderboard"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <Leaderboard />
              </Suspense>
            </MainLayout>
          }
        />

        {/* Public profiles — no auth required */}
        <Route
          path="/u/:username/followers"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <FollowersList />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/u/:username/following"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <FollowingList />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/u/:username"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <Profile />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/profile/:uid"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <Profile />
              </Suspense>
            </MainLayout>
          }
        />

        {/* Legal — public, lazy */}
        <Route
          path="/guidelines"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <Guidelines />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <Terms />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <MainLayout>
              <Suspense fallback={<PageShimmer />}>
                <Privacy />
              </Suspense>
            </MainLayout>
          }
        />

        {/* 404 — wraps its own MainLayout; fallback null since chunk is tiny */}
        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
