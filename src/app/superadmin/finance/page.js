'use client';

// Superadmin wrapper for finance dashboard
import FinanceDashboard from '@/app/finance/page';

export default function SuperAdminFinancePage() {
  // This page uses the same FinanceDashboard component
  // The layout will handle the superadmin context
  return <FinanceDashboard />;
}
