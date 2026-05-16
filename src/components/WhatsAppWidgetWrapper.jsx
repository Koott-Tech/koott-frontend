'use client';

import { usePathname } from 'next/navigation';
import WhatsAppWidget from './WhatsAppWidget';

export default function WhatsAppWidgetWrapper() {
  const pathname = usePathname();
  
  // Hide WhatsApp widget on admin, superadmin, finance, and psychologist dashboard pages
  // Keep it on user dashboard pages (profile) and all public pages
  const shouldHide = 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/finance') ||
    pathname.startsWith('/psychologist');
  
  if (shouldHide) {
    return null;
  }
  
  return <WhatsAppWidget />;
}

