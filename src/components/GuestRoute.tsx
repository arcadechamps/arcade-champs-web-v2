import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface GuestRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

export const GuestRoute = ({ children, redirectTo = "/dashboard" }: GuestRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (user) {
    const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    const isAuthPath = fromPath && AUTH_PATHS.includes(fromPath);
    const destination = fromPath && !isAuthPath ? fromPath : redirectTo;

    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
