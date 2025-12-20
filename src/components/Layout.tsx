
import React from 'react';
import { useLocation } from 'react-router-dom';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Only show navbar if not on dashboard */}
      {!isDashboard && (
        // Your navbar component
        <nav>...</nav>
      )}
      {children}
    </div>
  );
};