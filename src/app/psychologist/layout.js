'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PsychologistLayout({ children }) {
  // Desktop (>= 1024px): open by default, Mobile: closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // First visit: open on desktop, closed on mobile
      return window.innerWidth >= 1024;
    }
    return false; // SSR default
  });
  const { user, isAuthenticated, hasRole, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      if (!hasRole('psychologist')) {
        router.push('/');
        return;
      }
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/psychologist', icon: BarChart3 },
    { name: 'Sessions', href: '/psychologist/sessions', icon: Calendar },
    { name: 'Settings', href: '/psychologist/settings', icon: Settings }
  ];

  if (authLoading) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#025545' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile header with menu button */}
      <div 
        className="lg:hidden fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-200"
        style={!isSidebarOpen ? { boxShadow: '0 2px 8px rgba(63, 46, 115, 0.15)' } : {}}
      >
        <div className="flex items-center justify-between px-4 py-6 min-h-[4.5rem]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h6 className="text-sm font-semibold text-gray-800">Psychologist Dashboard</h6>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Mobile sidebar overlay and panel */}
      <div 
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-500 ease-in-out ${
          isSidebarOpen 
            ? 'opacity-100 visible' 
            : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Backdrop Overlay */}
        <div 
          className={`fixed inset-0 bg-white/30 backdrop-blur-[1px] transition-opacity duration-500 ease-in-out ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsSidebarOpen(false)}
          style={{ willChange: 'opacity' }}
        />
        
        {/* Sidebar Panel */}
        <div 
          className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r border-[#025545]/20 will-change-transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
          style={{ 
            transform: isSidebarOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
            transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            contain: 'layout style paint',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            zIndex: 40
          }}
        >
        <div className="flex flex-col h-full">
          {/* Logo/Brand - Mobile only */}
          <div className="lg:hidden p-4 border-b border-gray-200">
            <a 
              href="/psychologist"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="Koott - Go to psychologist dashboard"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
            >
              <img 
                src="/logo.png"
                alt="Koott"
                width={120}
                height={40}
                className="object-contain"
              />
            </a>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/psychologist' && pathname?.startsWith(item.href));
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-gray-700 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#025545]/10 text-[#025545] font-medium' 
                      : 'hover:bg-[#025545]/10 hover:text-[#025545]'
                  }`}
                  onClick={() => {
                    // Close mobile sidebar on navigation
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Desktop sidebar (always visible on lg and above) */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-[#025545]/20 z-40">
        <div className="flex flex-col h-full w-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-200">
            <a 
              href="/psychologist"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="Koott - Go to psychologist dashboard"
            >
              <img 
                src="/logo.png"
                alt="Koott"
                width={120}
                height={40}
                className="object-contain"
              />
            </a>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/psychologist' && pathname?.startsWith(item.href));
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-gray-700 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#025545]/10 text-[#025545] font-medium' 
                      : 'hover:bg-[#025545]/10 hover:text-[#025545]'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content (push right for desktop left sidebar) */}
      <div className={`lg:ml-64 transition-all duration-300 ease-in-out`}>
        {/* Top bar - Fixed header */}
        <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 left-64 z-30 min-h-[4.5rem]">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <h6 className="text-lg font-semibold text-gray-800">Psychologist Dashboard</h6>
              {user && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">{user.email}</span>
                  <span className="ml-2 text-gray-400 capitalize">({user.role})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content - Add padding-top to account for fixed header */}
        <main className="pt-24 lg:pt-24">
          {children}
        </main>
      </div>
    </div>
  );
}
