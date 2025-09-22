import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { PermissionsTest } from '@/components/test/PermissionsTest';

export default function PermissionsTestPage() {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <PermissionsTest />
      </div>
    </Layout>
  );
}
