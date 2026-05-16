"use client";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function ClientMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    // Show loading while auth is loading
    if (authLoading) {
      return;
    }
    
    // If user is authenticated, redirect to profile with messages tab
    if (user) {
      router.push('/profile?tab=messages');
    } else {
      // If not authenticated, redirect to home (auth modal will be shown by Header)
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Don't render a loading UI - root PageLoadingOverlay already shows on navigation to avoid double/overlapping loaders
  return null;
}
