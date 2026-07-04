'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Clock,
  FileText,
  MessageSquare,
  Package,
  ChevronDown,
  ChevronRight,
  Layers,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  Settings,
  Shield,
  Activity,
  UserCircle,
  BookOpen,
  ClipboardList,
  Ticket
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminLayout({ children }) {
  // Desktop (>= 1024px): open by default, Mobile: closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [isCmsMenuOpen, setIsCmsMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(false);
  const [isPsychologistMenuOpen, setIsPsychologistMenuOpen] = useState(false);
  const { user, isAuthenticated, hasRole, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      if (!hasRole('superadmin')) {
        router.push('/');
        return;
      }
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  // Keep CMS menu open if user is on any CMS page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const cmsPaths = ['/superadmin/blogs', '/superadmin/counselling', '/superadmin/assessments', '/superadmin/better-parenting'];
      const isOnCmsPage = cmsPaths.some(path => currentPath.startsWith(path));
      if (isOnCmsPage) {
        setIsCmsMenuOpen(true);
      }
      
      // Keep admin menu open if on admin pages
      const adminPaths = ['/superadmin/admin'];
      const isOnAdminPage = adminPaths.some(path => currentPath.startsWith(path));
      if (isOnAdminPage) {
        setIsAdminMenuOpen(true);
      }
      
      // Keep finance menu open if on finance pages
      const financePaths = ['/superadmin/finance'];
      const isOnFinancePage = financePaths.some(path => currentPath.startsWith(path));
      if (isOnFinancePage) {
        setIsFinanceMenuOpen(true);
      }
      
      // Keep psychologist menu open if on psychologist pages
      const psychologistPaths = ['/superadmin/psychologist'];
      const isOnPsychologistPage = psychologistPaths.some(path => currentPath.startsWith(path));
      if (isOnPsychologistPage) {
        setIsPsychologistMenuOpen(true);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/superadmin', icon: BarChart3 },
    {
      name: 'Admin',
      icon: Shield,
      hasSubmenu: true,
      submenu: [
        { name: 'Dashboard', href: '/superadmin/admin', icon: BarChart3 },
        { name: 'Doctors', href: '/superadmin/admin/doctors', icon: UserCheck },
        { name: 'Users', href: '/superadmin/admin/users', icon: Users },
        { name: 'Bookings', href: '/superadmin/admin/bookings', icon: Calendar },
        { name: 'Events', href: '/superadmin/admin/events', icon: Ticket },
        { name: 'Assessment Sessions', href: '/superadmin/admin/assessment-sessions', icon: Package },
        { name: 'Rescheduling', href: '/superadmin/admin/rescheduling', icon: RefreshCw },
        { name: 'Event pages (CMS)', href: '/superadmin/admin/events-cms', icon: Ticket },
      ]
    },
    {
      name: 'Finance',
      icon: DollarSign,
      hasSubmenu: true,
      submenu: [
        { name: 'Dashboard', href: '/superadmin/finance', icon: BarChart3 },
        { name: 'Revenue', href: '/superadmin/finance/revenue', icon: TrendingUp },
        { name: 'Sessions', href: '/superadmin/finance/sessions', icon: Calendar },
        { name: 'Payouts', href: '/superadmin/finance/payouts', icon: Wallet },
        { name: 'Doctors', href: '/superadmin/finance/doctors', icon: UserCheck },
        { name: 'Expenses', href: '/superadmin/finance/expenses', icon: Receipt },
        { name: 'Income', href: '/superadmin/finance/income', icon: TrendingUp },
        { name: 'Settings', href: '/superadmin/finance/settings', icon: Settings },
      ]
    },
    {
      name: 'Psychologist',
      icon: UserCircle,
      hasSubmenu: true,
      submenu: [
        { name: 'Dashboard', href: '/superadmin/psychologist', icon: BarChart3 },
        { name: 'Sessions', href: '/superadmin/psychologist/sessions', icon: Calendar },
        { name: 'Assessments', href: '/superadmin/psychologist/assessments', icon: Package },
        { name: 'Availability', href: '/superadmin/psychologist/availability', icon: Clock },
        { name: 'Messages', href: '/superadmin/psychologist/messages', icon: MessageSquare },
        { name: 'Notifications', href: '/superadmin/psychologist/notifications', icon: Activity },
        { name: 'Settings', href: '/superadmin/psychologist/settings', icon: Settings },
      ]
    },
    { 
      name: 'CMS', 
      icon: Layers, 
      hasSubmenu: true,
      submenu: [
        { name: 'Blogs', href: '/superadmin/blogs', icon: FileText },
        { name: 'Counselling Pages', href: '/superadmin/counselling', icon: MessageSquare },
        { name: 'Assessment Pages', href: '/superadmin/assessments', icon: FileText },
        { name: 'Better Parenting', href: '/superadmin/better-parenting', icon: FileText },
      ]
    },
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
          className={`fixed inset-y-0 right-0 w-64 bg-white shadow-xl border-l border-[#025545]/20 will-change-transform ${
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
              
              // Handle menus with submenu
              if (item.hasSubmenu && item.submenu) {
                const menuState = item.name === 'Admin' ? isAdminMenuOpen :
                                 item.name === 'Finance' ? isFinanceMenuOpen :
                                 item.name === 'Psychologist' ? isPsychologistMenuOpen :
                                 isCmsMenuOpen;
                const setMenuState = item.name === 'Admin' ? setIsAdminMenuOpen :
                                   item.name === 'Finance' ? setIsFinanceMenuOpen :
                                   item.name === 'Psychologist' ? setIsPsychologistMenuOpen :
                                   setIsCmsMenuOpen;
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setMenuState(!menuState)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </div>
                      {menuState ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {menuState && (
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
                                  ? 'bg-blue-100 text-blue-700 font-medium' 
                                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                              onClick={() => {
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
              const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  onClick={() => {
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
      <div className={`hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-[#025545]/20 z-40 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full w-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-200">
            <a 
              href="/superadmin"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="MyKoott - Go to super admin dashboard"
            >
              <img 
                src="/logo.png"
                alt="MyKoott"
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
              
              // Handle menus with submenu
              if (item.hasSubmenu && item.submenu) {
                const menuState = item.name === 'Admin' ? isAdminMenuOpen :
                                 item.name === 'Finance' ? isFinanceMenuOpen :
                                 item.name === 'Psychologist' ? isPsychologistMenuOpen :
                                 isCmsMenuOpen;
                const setMenuState = item.name === 'Admin' ? setIsAdminMenuOpen :
                                   item.name === 'Finance' ? setIsFinanceMenuOpen :
                                   item.name === 'Psychologist' ? setIsPsychologistMenuOpen :
                                   setIsCmsMenuOpen;
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setMenuState(!menuState)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </div>
                      {menuState ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {menuState && (
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
                                  ? 'bg-blue-100 text-blue-700 font-medium' 
                                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
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
              const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
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
      <div className={`transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        {/* Mobile header spacing */}
        <div className="lg:hidden h-16" />
        
        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
