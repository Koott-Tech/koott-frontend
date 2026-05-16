"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ProfileRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if there's a tab parameter
    const tab = searchParams.get('tab');
    
    if (tab) {
      // Redirect to the specified tab (e.g., /profile/profile); support legacy tab=contact
      const path = tab === 'contact' ? 'profile' : tab;
      router.replace(`/profile/${path}`);
    } else {
      // Default redirect to sessions page
      router.replace('/profile/sessions');
    }
  }, [router, searchParams]);

  // Don't render a loading spinner here - root PageLoadingOverlay already shows on navigation to avoid double/overlapping loaders
  return null;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileRedirect />
    </Suspense>
  );
}
