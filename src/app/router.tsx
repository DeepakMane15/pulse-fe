import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ClearanceLayout } from './guards/clearance-layout';
import { RootLayout } from './layout';
import { PERMISSIONS } from '../lib/clearances';
import LoginPage from './public/login/page';
import ProtectedLayout from './protected/layout';
import HomePage from './protected/page';
import TenantsPage from './protected/tenants/page';
import ManageUsersPage from './protected/users/page';
import VideoLibraryPage from './protected/video-library/page';

/**
 * App Router–style tree: root layout → public login | protected shell → home.
 * Permission-gated segments use `ClearanceLayout` (same bitmask rule as backend).
 */
export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedLayout />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: 'video-library',
            element: <ClearanceLayout requiredMask={PERMISSIONS.VIEW_VIDEO} />,
            children: [{ index: true, element: <VideoLibraryPage /> }]
          },
          {
            path: 'tenants',
            element: <ClearanceLayout requiredMask={PERMISSIONS.GLOBAL_ADMIN} />,
            children: [{ index: true, element: <TenantsPage /> }]
          },
          {
            path: 'users',
            element: <ClearanceLayout requiredMask={PERMISSIONS.MANAGE_USERS} />,
            children: [{ index: true, element: <ManageUsersPage /> }]
          }
        ]
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
