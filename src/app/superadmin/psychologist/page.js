'use client';

// Superadmin wrapper for psychologist dashboard
import PsychologistDashboard from '@/app/psychologist/page';

export default function SuperAdminPsychologistPage() {
  // This page uses the same PsychologistDashboard component
  // The layout will handle the superadmin context
  return <PsychologistDashboard />;
}
