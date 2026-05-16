'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterWrapper() {
  const pathname = usePathname();
  
  // Don't show footer on admin, superadmin, finance, staff, psychologist, and client dashboard pages
  // Note: /online-child-psychologist (listing page) should show footer, only /psychologist (dashboard) should hide it
  const shouldHideFooter = pathname.startsWith('/admin') || 
                            pathname.startsWith('/superadmin') || 
                            pathname.startsWith('/finance') || 
                            pathname.startsWith('/staff') || 
                            pathname.startsWith('/profile') ||
                            (pathname.startsWith('/psychologist') && !pathname.startsWith('/online-child-psychologist'));
  
  if (shouldHideFooter) {
    return null;
  }
  
  // Check if we're on the home page
  const isHomePage = pathname === '/';
  
  // Check if we're on a CMS page (counselling only; assessments and better-parenting removed)
  const isCmsPage = pathname.startsWith('/counselling/');
  
  // Check if we're on a therapist/psychologist profile page (no gap above footer)
  const isTherapistProfile = pathname.startsWith('/therapist-profile') || pathname.startsWith('/online-child-psychologist');
  
  return <Footer isHomePage={isHomePage} isCmsPage={isCmsPage} isTherapistProfile={isTherapistProfile} />;
}

