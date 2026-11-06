import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { DiscoverPage } from './pages/DiscoverPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventEditorPage } from './pages/EventEditorPage'
import { ManageEventPage } from './pages/ManageEventPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrganizePage } from './pages/OrganizePage'
import { PlansPage } from './pages/PlansPage'
import { ProfilePage } from './pages/ProfilePage'
import { RouteErrorPage } from './pages/RouteErrorPage'

// BASE_URL comes from VITE_BASE_PATH, so routes work under a repository subpath.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <DiscoverPage /> },
        { path: 'events/:id', element: <EventDetailPage /> },
        { path: 'plans', element: <PlansPage /> },
        { path: 'organize', element: <OrganizePage /> },
        { path: 'organize/new', element: <EventEditorPage /> },
        { path: 'organize/:id', element: <ManageEventPage /> },
        { path: 'organize/:id/edit', element: <EventEditorPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename },
)

export function App() {
  return <RouterProvider router={router} />
}
