'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebarContext } from '@/contexts/AdminSidebarContext';
import Image from 'next/image';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Clock,
  FileText,
  MessageSquare,
  Package,
  ChevronDown,
  ChevronRight,
  Layers,
  RefreshCw,
  Briefcase,
  Ticket,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout({ children }) {
  // Desktop (>= 1024px): open by default, Mobile: closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // First visit: open on desktop, closed on mobile
      return window.innerWidth >= 1024;
    }
    return false; // SSR default
  });
  const [isCmsMenuOpen, setIsCmsMenuOpen] = useState(false);
  const { user, isAuthenticated, hasRole, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      if (!hasRole('admin') && !hasRole('superadmin')) {
        router.push('/');
        return;
      }
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  // Keep CMS menu open if user is on any CMS page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const cmsPaths = ['/admin/blogs', '/admin/counselling', '/admin/assessments', '/admin/better-parenting', '/admin/careers', '/admin/events-cms'];
      const isOnCmsPage = cmsPaths.some(path => currentPath.startsWith(path));
      if (isOnCmsPage) {
        setIsCmsMenuOpen(true);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Doctors', href: '/admin/doctors', icon: UserCheck },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
    { name: 'Koott Discover', href: '/admin/wix-discover', icon: Globe },
    { name: 'Koott Therapists', href: '/admin/wix-therapists', icon: UserCheck },
    { name: 'Events', href: '/admin/events', icon: Ticket },
    { name: 'Free Assessments', href: '/admin/free-assessments', icon: Calendar },
    { name: 'Assessment Sessions', href: '/admin/assessment-sessions', icon: Package },
    { name: 'Rescheduling', href: '/admin/rescheduling', icon: RefreshCw },
    { 
      name: 'CMS', 
      icon: Layers, 
      hasSubmenu: true,
      submenu: [
        { name: 'Blogs', href: '/admin/blogs', icon: FileText },
        { name: 'Counselling Pages', href: '/admin/counselling', icon: MessageSquare },
        { name: 'Assessment Pages', href: '/admin/assessments', icon: FileText },
        { name: 'Better Parenting', href: '/admin/better-parenting', icon: FileText },
        { name: 'Careers', href: '/admin/careers', icon: Briefcase },
        { name: 'Event pages', href: '/admin/events-cms', icon: Ticket },
      ]
    },
  ];

  if (authLoading) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#3f2e73' }}></div>
      </div>
    );
  }

  const sidebarValue = {
    isSidebarOpen: isSidebarOpen,
    setSidebarOpen: setIsSidebarOpen,
    toggleSidebar: () => setIsSidebarOpen((o) => !o),
  };

  return (
    <AdminSidebarContext.Provider value={sidebarValue}>
    <div className="min-h-screen bg-white">
      {/* Mobile header with menu button */}
      <div 
        className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white flex items-center justify-end px-4 z-50"
        style={!isSidebarOpen ? { boxShadow: '0 2px 8px rgba(63, 46, 115, 0.15)' } : {}}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md bg-white shadow-lg"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
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
          className={`fixed inset-y-0 right-0 w-64 bg-white shadow-xl border-l border-[#3f2e73]/20 will-change-transform ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          } lg:left-0 lg:right-auto lg:translate-x-0`}
          style={{ 
            transform: isSidebarOpen ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
            transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            contain: 'layout style paint',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            zIndex: 40
          }}
        >
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              
              // Handle CMS menu with submenu
              if (item.hasSubmenu && item.submenu) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setIsCmsMenuOpen(!isCmsMenuOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-700 rounded-lg hover:bg-[#3f2e73]/10 hover:text-[#3f2e73] transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </div>
                      {isCmsMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {isCmsMenuOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                          return (
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                                isSubActive 
                                  ? 'bg-[#3f2e73]/10 text-[#3f2e73] font-medium' 
                                  : 'text-gray-600 hover:bg-[#3f2e73]/10 hover:text-[#3f2e73]'
                              }`}
                              onClick={() => {
                                // Close mobile sidebar on navigation
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                  setIsSidebarOpen(false);
                                }
                              }}
                            >
                              <SubIcon className="h-4 w-4 mr-3" />
                              {subItem.name}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Regular menu item
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#3f2e73]/10 text-[#3f2e73] font-medium' 
                      : 'text-gray-700 hover:bg-[#3f2e73]/10 hover:text-[#3f2e73]'
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

      {/* Desktop sidebar (toggleable on lg and above) */}
      <div className={`hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-[#3f2e73]/20 z-40 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full w-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-200">
            <a 
              href="/admin"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="Koott - Go to admin dashboard"
            >
              <img 
                src="/mainlogo.webp"
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
              
              // Handle CMS menu with submenu
              if (item.hasSubmenu && item.submenu) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setIsCmsMenuOpen(!isCmsMenuOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-700 rounded-lg hover:bg-[#3f2e73]/10 hover:text-[#3f2e73] transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </div>
                      {isCmsMenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {isCmsMenuOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                          return (
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                                isSubActive 
                                  ? 'bg-[#3f2e73]/10 text-[#3f2e73] font-medium' 
                                  : 'text-gray-600 hover:bg-[#3f2e73]/10 hover:text-[#3f2e73]'
                              }`}
                            >
                              <SubIcon className="h-4 w-4 mr-3" />
                              {subItem.name}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Regular menu item
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#3f2e73]/10 text-[#3f2e73] font-medium' 
                      : 'text-gray-700 hover:bg-[#3f2e73]/10 hover:text-[#3f2e73]'
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

      {/* Main content (adjust margin based on sidebar state) */}
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        {/* Top bar - Fixed header */}
        <div className={`hidden lg:block bg-white shadow-sm border-b border-gray-200 px-6 py-4 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'left-64' : 'left-0'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Small icon to hide/unhide side menu */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                aria-label={isSidebarOpen ? 'Hide side menu' : 'Show side menu'}
                title={isSidebarOpen ? 'Hide side menu' : 'Show side menu'}
              >
                {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </button>
            <h6>Koott Admin Panel</h6>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.email}</span>
                  <span className="ml-2 text-gray-400 capitalize">({user.role})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content - Add padding-top to account for fixed header */}
        <main className="lg:pt-16">
          {children}
        </main>
      </div>

    </div>
    </AdminSidebarContext.Provider>
  );
}
