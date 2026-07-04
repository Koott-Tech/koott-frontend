'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  BarChart3, 
  Calendar, 
  DollarSign,
  Receipt,
  TrendingUp,
  Settings, 
  LogOut,
  Menu,
  X,
  Wallet,
  FileText,
  Percent,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/backendApi';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';

// Cache removed - always fetch fresh data from API

export default function FinanceLayout({ children }) {
  // Desktop (>= 1024px): open by default, Mobile: closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const { user, isAuthenticated, hasRole, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize header stats - no caching, always fetch fresh data
  const [headerStats, setHeaderStats] = useState({
    total_revenue: 0,
    net_profit: 0,
    total_expenses: 0,
    pending_payouts: 0,
    total_sessions: 0,
    total_doctor_wallet: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      if (!hasRole('finance') && !hasRole('admin') && !hasRole('superadmin')) {
        router.push('/');
        return;
      }
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  // Load header stats - always fetch fresh data (no caching)
  useEffect(() => {
    const loadHeaderStats = async () => {
      try {
        setIsLoadingStats(true);
        
        const b = istCalendarMonthBounds(new Date());
        const dates = { from: formatIstCalendarYmd(b.from), to: formatIstCalendarYmd(b.to) };
        const response = await financeApi.getDashboard({
          dateFrom: dates.from,
          dateTo: dates.to
        });
        if (response.success && response.data?.summary) {
          const stats = response.data.summary;
          setHeaderStats(stats);
        }
      } catch (err) {
        console.error('Failed to load header stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (!authLoading && (hasRole('finance') || hasRole('admin') || hasRole('superadmin'))) {
      // Always load fresh data (no cache)
      loadHeaderStats();
      
      // Refresh every 30 seconds to keep data fresh
      const interval = setInterval(() => {
        loadHeaderStats();
      }, 30 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [authLoading, hasRole]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/finance', icon: BarChart3 },
    { name: 'Sessions', href: '/finance/sessions', icon: Calendar },
{ name: 'Revenue', href: '/finance/revenue', icon: TrendingUp },
    { name: 'Doctors', href: '/finance/doctors', icon: Users },
    { name: 'Users', href: '/finance/users', icon: Users },
    { name: 'Expenses', href: '/finance/expenses', icon: Receipt },
    { name: 'Income', href: '/finance/income', icon: DollarSign },
    { name: 'Payouts', href: '/finance/payouts', icon: CreditCard },
    { name: 'Settings', href: '/finance/settings', icon: Settings },
  ];

  if (authLoading) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#025545' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header with menu button and key stats */}
      <div 
        className="lg:hidden fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-200"
        style={!isSidebarOpen ? { boxShadow: '0 2px 8px rgba(63, 46, 115, 0.15)' } : {}}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100"
        >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
            <h6 className="text-sm font-semibold text-gray-800">Finance</h6>
            <div className="w-9"></div> {/* Spacer for centering */}
          </div>
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
          className={`fixed inset-y-0 right-0 w-64 bg-white shadow-xl border-l border-[#025545]/20 will-change-transform ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
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
          {/* Logo/Brand - Mobile only */}
          <div className="lg:hidden p-4 border-b border-gray-200">
            <a 
              href="/finance"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="MyKoott - Go to finance dashboard"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
            >
              <img 
                src="/logo.png"
                alt="MyKoott - Finance Dashboard"
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
              const isActive = pathname === item.href;
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#025545] text-white' 
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
              href="/finance"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="MyKoott - Go to finance dashboard"
            >
              <img 
                src="/logo.png"
                alt="MyKoott - Finance Dashboard"
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
              const isActive = pathname === item.href;
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#025545] text-white' 
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
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        {/* Top bar - Fixed header with Finance Stats */}
        <div className={`hidden lg:block bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'left-64' : 'left-0'
        }`}>
          <div className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                {/* Toggle sidebar button */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <h6 className="text-lg font-semibold text-gray-800">Finance Dashboard</h6>
              </div>
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
        <main className="pt-20 lg:pt-24">
          {children}
        </main>
      </div>

    </div>
  );
}

