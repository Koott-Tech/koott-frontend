"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ClickBurst from "./ClickBurst";

// Routes that never get the decorative click burst, whatever the role.
const NO_BURST_PREFIXES = ['/assessments'];

export default function ConditionalClickBurst() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // Assessment questionnaires are clinical forms - no decorative effects.
  if (NO_BURST_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }
  
  // Only show click burst for client role (or when not logged in / loading)
  // Hide for admin, superadmin, psychologist, finance roles
  const userRole = user?.role;
  const isNonClientRole = userRole === 'admin' || 
                         userRole === 'superadmin' || 
                         userRole === 'psychologist' || 
                         userRole === 'finance';
  
  // Don't render if user is a non-client role
  if (!isLoading && isNonClientRole) {
    return null;
  }
  
  // Render ClickBurst for clients or when loading/not logged in
  return <ClickBurst />;
}
