import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './layout';
import LoginPage from './public/login/page';
import ProtectedLayout from './protected/layout';
import HomePage from './protected/page';

/**
 * App Router–style tree: root layout → public login | protected shell → home.
 * For permission-gated segments, nest a route with element={<ClearanceLayout requiredMask={...} />}
 * and child routes (see `app/guards/clearance-layout.tsx`).
 */
export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedLayout />,
        children: [{ index: true, element: <HomePage /> }]
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
