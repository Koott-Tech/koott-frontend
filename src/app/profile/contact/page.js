"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContactRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/profile');
  }, [router]);

  // Don't render a loading spinner - root PageLoadingOverlay already shows on navigation to avoid double/overlapping loaders
  return null;
}
