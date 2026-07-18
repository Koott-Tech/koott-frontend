'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

export default function HeaderWrapper() {
  const pathname = usePathname();
  
  // Hide global site header on admin, superadmin, psychologist, finance dashboards
  // Note: /online-child-psychologist (listing page) should show header, only /psychologist (dashboard) should hide it
  const shouldHideCompletely = pathname.startsWith('/admin') || 
                                pathname.startsWith('/superadmin') || 
                                pathname.startsWith('/finance') ||
                                pathname.startsWith('/event-organizer') ||
                                (pathname.startsWith('/psychologist') && !pathname.startsWith('/online-child-psychologist'));
  
  if (shouldHideCompletely) return null;
  
  // For client dashboard (/profile), show header only on laptop/desktop, hide on mobile
  const isClientDashboard = pathname.startsWith('/profile');
  
  if (isClientDashboard) {
    return (
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white">
        <Header />
      </div>
    );
  }
  
  return <Header />;
}
