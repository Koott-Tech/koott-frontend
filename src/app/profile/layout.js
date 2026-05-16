"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../lib/backendApi";
import { 
  Calendar, 
  LogOut,
  FileText,
  User,
  MessageSquare,
  BarChart3,
  Receipt,
  X,
  Menu,
  Home,
  Users,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

export default function ProfileLayout({ children }) {
  const { user, logout, hasRole, login, token, isLoading: authLoading, isRemembered } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Load sidebar state from localStorage, default based on screen size
  // Desktop (>= 1024px): open by default, Mobile: closed by default
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('profileSidebarOpen');
      if (saved !== null) {
        return saved === 'true';
      }
      // First visit: open on desktop, closed on mobile
      return window.innerWidth >= 1024;
    }
    return true; // SSR default
  });
  const [profileData, setProfileData] = useState(null);

  const navigation = [
    { name: 'Home', href: '/', icon: Home, show: true },
  { name: 'Browse Therapists', href: '/online-child-psychologist', icon: Users, show: false },
    { name: 'Sessions', href: '/profile/sessions', icon: Calendar },
    { name: 'Messages', href: '/profile/messages', icon: MessageSquare },
    { name: 'Profile', href: '/profile/profile', icon: User },
    { name: 'Report', href: '/profile/reports', icon: BarChart3 },
    { name: 'Packages', href: '/profile/packages', icon: FileText, show: hasRole('client') },
    { name: 'Receipts', href: '/profile/receipts', icon: Receipt, show: hasRole('client') },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if user exists and we don't already have profile data
      // Skip if user already has full profile data
      if (user && !profileData && !user.first_name && !user.last_name) {
        try {
          const response = await authApi.getProfile({ silent: true });
          
          if (response?.data?.user) {
            const profile = response.data.user.profile || response.data.user;
            setProfileData(profile);
            // Update the auth context with full profile data
            if (token) {
              login({ ...user, profile }, token, { remember: isRemembered });
            }
          }
        } catch (error) {
          // Silently fail - non-critical
        }
      }
    };
    
    fetchProfile();
  }, [user, profileData]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Prefer showing full name from loaded profile or auth context; avoid flashing email
  const displayName = (profileData?.first_name && profileData?.last_name)
    ? `${profileData.first_name} ${profileData.last_name}`
    : (user?.profile?.first_name && user?.profile?.last_name)
      ? `${user.profile.first_name} ${user.profile.last_name}`
      : null;

  const handleNavigationClick = (item) => {
    // Close mobile sidebar on navigation (desktop sidebar stays open)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    router.push(item.href);
  };

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('profileSidebarOpen', sidebarOpen.toString());
    }
  }, [sidebarOpen]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const isActive = (href) => {
    return pathname === href;
  };

  useEffect(() => {
    // Only redirect if auth has finished loading AND user is not authenticated
    // This prevents redirecting on page refresh when auth is still loading
    if (authLoading) {
      return; // Don't redirect while auth is loading - wait for auth to finish
    }
    
    // Only redirect when auth has finished loading and user is confirmed to be null
    if (!user) {
      if (typeof window !== 'undefined') {
        // Let Header know to show AuthModal
        localStorage.setItem('auth_error', 'Please log in to view your profile.');
      }
      router.replace('/');
    }
  }, [user, router, authLoading]);

  // Show loading while auth is loading (prevents premature redirect)
  if (authLoading) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#3f2e73' }}></div>
      </div>
    );
  }

  // Only show nothing/redirect if auth has finished loading and user is still null
  // This means user is definitely not authenticated
  if (!user) {
    // Show nothing while redirecting; Header will show login modal on home
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile sidebar (slide from right) */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-in-out ${
          sidebarOpen 
            ? 'opacity-100 visible' 
            : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Backdrop Overlay */}
        <div 
          className={`fixed inset-0 bg-white/30 backdrop-blur-[1px] transition-opacity duration-500 ease-in-out ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
          style={{ willChange: 'opacity' }}
        />
        
        {/* Sidebar Panel */}
        <div 
          className={`fixed inset-y-0 right-0 w-64 flex flex-col bg-white border-l border-[#3f2e73]/20 shadow-xl will-change-transform ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ 
            transform: sidebarOpen ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
            transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            contain: 'layout style paint',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <div className="flex h-16 items-center justify-end px-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          
          <nav className="flex-1 space-y-4 px-2 py-4">
            {navigation.filter(item => item.show !== false).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigationClick(item)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors w-full text-left cursor-pointer ${
                    active 
                      ? 'text-gray-900 border-l-4' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  style={active ? { borderLeftColor: '#3f2e73' } : {}}
                >
                  <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  {item.name}
                </button>
              );
            })}
          </nav>
          
          {/* Logout button at bottom of sidebar */}
          <div className="border-t border-gray-200 p-4 mb-8">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar toggle button - outside when closed */}
      {!sidebarOpen && (
        <div className="hidden lg:block fixed top-20 left-4 z-50">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Toggle sidebar"
          >
            <PanelLeftOpen className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:flex lg:w-64 lg:flex-col z-30 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 relative group">
          <nav className={`flex-1 space-y-4 px-2 py-4 transition-all duration-300 ${
            sidebarOpen ? 'pt-6' : 'pt-6'
          }`}>
            {navigation.filter(item => item.show !== false).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigationClick(item)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors w-full text-left cursor-pointer ${
                    active 
                      ? 'text-gray-900 border-l-4' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  style={active ? { borderLeftColor: '#3f2e73' } : {}}
                >
                  <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  {item.name}
                </button>
              );
            })}
          </nav>
          
          {/* Toggle button - inside sidebar, above logout */}
          <div className="p-4 pb-2 flex justify-end">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
          </div>
          
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-white w-full border-b border-gray-200">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            {/* Logo removed */}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {displayName || 'User'}
            </span>
            <button
              onClick={handleLogout}
              className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              style={{ backgroundColor: '#3f2e73' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
            >
              Get started
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`lg:transition-all lg:duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        {/* Mobile header */}
        <div 
          className="lg:hidden flex h-16 items-center justify-between px-4 bg-white w-full sticky top-0 z-40"
          style={!sidebarOpen ? { boxShadow: '0 2px 8px rgba(63, 46, 115, 0.15)' } : {}}
        >
          <div className="flex items-center shrink-0" style={{ maxHeight: '24px' }}>
            <img 
              src="/mainlogo.webp" 
              alt="Koott Logo" 
              className="w-auto hover:opacity-80 transition-opacity object-contain"
              style={{ height: '24px', maxHeight: '24px' }}
            />
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-600"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="lg:pt-24 relative min-h-[calc(100vh-6rem)]">
          <div className="relative min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

