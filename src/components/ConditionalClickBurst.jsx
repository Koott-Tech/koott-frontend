"use client";

import { useAuth } from "@/contexts/AuthContext";
import ClickBurst from "./ClickBurst";

export default function ConditionalClickBurst() {
  const { user, isLoading } = useAuth();
  
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
