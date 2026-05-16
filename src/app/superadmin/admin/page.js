'use client';

// Superadmin wrapper for admin dashboard
import AdminDashboard from '@/app/admin/page';

export default function SuperAdminAdminPage() {
  // This page uses the same AdminDashboard component
  // The layout handles superadmin authentication
  // hasRole('admin') will return true for superadmin users
  return <AdminDashboard />;
}
