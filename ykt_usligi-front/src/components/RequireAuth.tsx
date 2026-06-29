import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../api/auth';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};
