'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Ticket, Globe } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EventOrganizerDashboard() {
  const { user, isAuthenticated, hasRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated() || (!hasRole('event_organizer') && !hasRole('admin') && !hasRole('superadmin'))) {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, hasRole, router]);

  if (isLoading) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.first_name || 'Event Organizer'}</h1>
        <p className="text-gray-600 mt-2">Manage your events and registrations from here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/event-organizer/events" className="group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all h-full">
            <div className="h-12 w-12 bg-[#025545]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Ticket className="h-6 w-6 text-[#025545]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Registrations</h3>
            <p className="text-gray-600 text-sm">
              View and manage all user registrations for your workshops and events.
            </p>
          </div>
        </Link>

        <Link href="/event-organizer/events-cms" className="group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all h-full">
            <div className="h-12 w-12 bg-[#025545]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Globe className="h-6 w-6 text-[#025545]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Pages (CMS)</h3>
            <p className="text-gray-600 text-sm">
              Create and edit the landing pages for your events using the headless CMS.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
