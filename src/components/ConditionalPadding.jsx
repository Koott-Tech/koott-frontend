"use client";
import { usePathname } from "next/navigation";

export default function ConditionalPadding({ children }) {
  const pathname = usePathname();
  
  // Pages that should have full width (no padding)
  const fullWidthPages = [
    '/',
    '/profile',
    '/psychologist',
    '/admin',
    '/superadmin',
    '/therapist-profile',
    '/messages'
  ];
  
  // Check if current path starts with any full-width page
  const isFullWidthPage = fullWidthPages.some(page => pathname.startsWith(page));
  
  if (isFullWidthPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24">
      {children}
    </div>
  );
}
