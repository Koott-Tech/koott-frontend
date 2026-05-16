'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  TrendingUp,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  CalendarCheck,
  ArrowRightLeft
} from 'lucide-react';
import { adminApi, dashboardApi } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import { cache, withCache } from '@/lib/cache';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { sessionBookedAtIso } from '@/lib/sessionBookedAt';
import { Filter } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalBookings: 0,
    recentBookings: 0,
    bookingStatuses: {
      upcoming: 0,
      rescheduled: 0,
      rescheduleRequested: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    // Check authentication and role
    if (!authLoading) {
      if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to home');
        router.push('/');
        return;
      }
      
      if (!hasRole('admin') && !hasRole('superadmin')) {
        console.log('User does not have admin privileges, redirecting to profile');
        router.push('/profile');
        return;
      }
      
      // User is authenticated and has admin role, load dashboard data
      loadDashboardData();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  // Reload dashboard data when date range changes
  useEffect(() => {
    if (!authLoading && (hasRole('admin') || hasRole('superadmin')) && dateRange) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, authLoading]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading dashboard data...');

      // Check cache first
      const cachedStats = cache.get('dashboard_stats');
      if (cachedStats) {
        console.log('📦 Using cached dashboard stats');
        setStats(cachedStats);
        setIsLoading(false);
        
        // Load fresh data in background
        setTimeout(() => {
          loadFreshData();
        }, 100);
        return;
      }

      // Load fresh data
      await loadFreshData();

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFreshData = async () => {
    try {
      let start_date = null;
      let end_date = null;

      if (hasDateRangeBounds(dateRange)) {
        start_date = formatIstCalendarYmd(dateRange.from) || null;
        end_date = formatIstCalendarYmd(dateRange.to) || null;
      }

      // Load only essential stats first (faster)
      console.log('Fetching platform stats...', { start_date, end_date });
      const platformStats = await adminApi.getPlatformStats({
        start_date,
        end_date
      });
      console.log('Platform stats response:', platformStats);
      
      let newStats = {
        totalUsers: 0, // This now represents total clients
        totalClients: 0, // Explicit clients count
        totalDoctors: 0,
        totalBookings: 0,
        recentUsers: 0,
        recentBookings: 0
      };
      
      if (platformStats && platformStats.success) {
        newStats = { 
          ...newStats, 
          ...platformStats.data,
          bookingStatuses: platformStats.data?.bookingStatuses || {
            upcoming: 0,
            rescheduled: 0,
            rescheduleRequested: 0,
            completed: 0,
            noShow: 0,
            cancelled: 0
          },
        };
      } else {
        console.warn('Platform stats response format unexpected:', platformStats);
        newStats = {
          ...newStats,
          totalUsers: platformStats?.data?.totalClients || platformStats?.data?.totalUsers || 0,
          totalClients: platformStats?.data?.totalClients || platformStats?.data?.totalUsers || 0,
          totalDoctors: platformStats?.data?.totalDoctors || 0,
          totalBookings: platformStats?.data?.totalBookings || 0,
          bookingStatuses: platformStats?.data?.bookingStatuses || {
            upcoming: 0,
            booked: 0,
            rescheduled: 0,
            rescheduleRequested: 0,
            completed: 0,
            noShow: 0,
            cancelled: 0
          }
        };
      }

      // Load recent bookings for activity section (today's activity only)
      try {
        const recentBookingsResponse = await adminApi.getRecentBookings(10);
        if (recentBookingsResponse && recentBookingsResponse.success) {
          setRecentBookings(recentBookingsResponse.data || []);
        }
      } catch (error) {
        console.error('Error fetching recent bookings:', error);
      }

      // Load recent data in background (non-blocking)
      console.log('Fetching recent data in background...');
      Promise.all([
        dashboardApi.getRecentUsers(10), // Increased to 10 for better overview
        dashboardApi.getRecentBookings(10) // Increased to 10 for better overview
      ]).then(([recentUsers, recentBookings]) => {
        console.log('Recent users response:', recentUsers);
        console.log('Recent bookings response:', recentBookings);

        // Update stats with recent data counts
        const updatedStats = {
          ...newStats,
          recentUsers: recentUsers?.data?.length || recentUsers?.length || 0,
          recentBookings: recentBookings?.data?.length || recentBookings?.length || 0
        };

        setStats(updatedStats);
        
        // Cache the results for 10 minutes (optimized for 2GB plan)
        cache.set('dashboard_stats', updatedStats, 10 * 60 * 1000);
      }).catch(error => {
        console.warn('Background data loading failed:', error);
        // Don't show error for background loading
      });

      // Set initial stats immediately
      setStats(newStats);
      
      // Cache the initial stats for 10 minutes (optimized for 2GB plan)
      cache.set('dashboard_stats', newStats, 10 * 60 * 1000);

    } catch (error) {
      console.error('Failed to load fresh data:', error);
      throw error;
    }
  };

  const handleRefresh = () => {
    // Clear cache and reload
    cache.clear('dashboard_stats');
    loadDashboardData();
  };

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-[#3f2e73]',
      description: 'Registered clients on the platform'
    },
    {
      title: 'Total Doctors',
      value: stats.totalDoctors,
      icon: UserCheck,
      color: 'bg-green-500',
      description: 'Active psychologists and therapists'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'bg-purple-500',
      description: 'All therapy sessions booked'
    },
    {
      title: 'Recent Activity',
      value: stats.recentBookings,
      icon: Activity,
      color: 'bg-orange-500',
      description: 'Bookings in the last 7 days'
    }
  ];

  const bookingStatusCards = [
    {
      title: 'Upcoming Bookings',
      value: stats.bookingStatuses?.upcoming || 0,
      icon: CalendarCheck,
      color: 'bg-[#3f2e73]',
      description: 'All confirmed future sessions',
      subValue: stats.totalBookings > 0 
        ? `${((stats.bookingStatuses?.upcoming || 0) / stats.totalBookings * 100).toFixed(1)}% of total`
        : ''
    },
    {
      title: 'Rescheduled',
      value: stats.bookingStatuses?.rescheduled || 0,
      icon: ArrowRightLeft,
      color: 'bg-purple-500',
      description: 'Sessions that were rescheduled',
      subValue: stats.totalBookings > 0 
        ? `${((stats.bookingStatuses?.rescheduled || 0) / stats.totalBookings * 100).toFixed(1)}% of total`
        : ''
    },
    {
      title: 'Reschedule Requested',
      value: stats.bookingStatuses?.rescheduleRequested || 0,
      icon: RefreshCw,
      color: 'bg-amber-500',
      description: 'Pending reschedule requests',
      subValue: 'Requires attention'
    },
    {
      title: 'Completed',
      value: stats.bookingStatuses?.completed || 0,
      icon: CheckCircle,
      color: 'bg-green-600',
      description: 'Sessions that were completed',
      subValue: stats.totalBookings > 0 
        ? `${((stats.bookingStatuses?.completed || 0) / stats.totalBookings * 100).toFixed(1)}% of total`
        : ''
    },
    {
      title: 'No-Show Sessions',
      value: stats.bookingStatuses?.noShow || 0,
      icon: AlertCircle,
      color: 'bg-red-600',
      description: 'Sessions where client did not show',
      subValue: stats.totalBookings > 0 
        ? `${((stats.bookingStatuses?.noShow || 0) / stats.totalBookings * 100).toFixed(1)}% of total`
        : ''
    }
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#3f2e73]"></div>
      </div>
    );
  }

  // Check if user has admin privileges
  if (!user || (!hasRole('admin') && !hasRole('superadmin'))) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            </div>
          </div>
          <div className="ml-3">
            <h6>Access Denied</h6>
            <p className="text-sm text-red-700 mt-1">You do not have permission to access the admin dashboard.</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => router.push('/profile')}
            className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#3f2e73]"></div>
    </div>
  );
  }

  if (error) {
                      return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                </div>
                  </div>
          <div className="ml-3">
            <h6>Error</h6>
            <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
        <div className="mt-4">
                  <button
            onClick={loadDashboardData}
            className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200"
          >
            Try Again
                  </button>
                </div>
    </div>
  );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap items-start md:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <DateRangePicker
            selectedRange={dateRange}
            onSelect={setDateRange}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 sm:p-3 rounded-lg bg-[#3f2e73] text-white flex-shrink-0">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
              </div>
              <p className="number-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Booking Status Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h6>Booking Status Metrics</h6>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {bookingStatusCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#3f2e73] text-white flex-shrink-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">{card.title}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity - Last Day Bookings */}
      {recentBookings.length > 0 && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h6>Recent Activity</h6>
            </div>
          <a href="/admin/bookings" className="text-xs sm:text-sm text-[#3f2e73] hover:text-[#1d1733]">
            View All
          </a>
        </div>
        <div className="space-y-2 sm:space-y-3">
            {recentBookings.slice(0, 5).map((booking) => {
              const clientName = booking.client?.child_name || 
                `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() || 
                'Unknown Client';
              const psychologistName = booking.psychologist ? 
                `Dr. ${booking.psychologist.first_name} ${booking.psychologist.last_name}` : 
                'Unknown Psychologist';
              
              // Format time
              const createdAt = new Date(sessionBookedAtIso(booking) || booking.created_at);
              const now = new Date();
              const diffMs = now - createdAt;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              
              let timeAgo;
              if (diffMins < 1) {
                timeAgo = 'Just now';
              } else if (diffMins < 60) {
                timeAgo = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
              } else if (diffHours < 24) {
                timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
              } else {
                timeAgo = createdAt.toLocaleDateString();
              }

              return (
                <div key={booking.id} className="flex items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 rounded-lg bg-[#3f2e73]/10 mr-2 sm:mr-3 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-[#3f2e73]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Booking: {clientName} with {psychologistName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.scheduled_date && booking.scheduled_time 
                        ? `Scheduled: ${booking.scheduled_date} at ${booking.scheduled_time.split(':').slice(0, 2).join(':')}`
                        : 'No date scheduled'}
                      {' • '}
                      {timeAgo}
                    </p>
            </div>
          </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

