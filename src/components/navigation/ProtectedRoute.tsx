import React from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { StudentRouteHandler } from './StudentRouteHandler';
import { ParentRouteHandler } from './ParentRouteHandler';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  return (
    <AuthenticatedLayout>
      <StudentRouteHandler>
        <ParentRouteHandler>
          {children}
        </ParentRouteHandler>
      </StudentRouteHandler>
    </AuthenticatedLayout>
  );
};
