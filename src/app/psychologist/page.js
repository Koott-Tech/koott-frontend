"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { psychologistApi } from "../../lib/backendApi";
import { useNotification } from "../../contexts/NotificationContext";
import { 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertCircle,
  DollarSign,
  CheckCircle,
  Filter
} from "lucide-react";
import DateRangePicker from "@/components/ui/date-range-picker";
import { hasDateRangeBounds } from "@/lib/dateRangeBounds";
import { formatIstCalendarYmd, istCalendarMonthBounds } from "@/lib/wixFinanceDates";
import { sessionBookingCreatedIstYmd } from "@/lib/sessionBookedAt";

export default function PsychologistDashboard() {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0
  });
  const [payoutStats, setPayoutStats] = useState({
    incomeEarned: 0,
    pendingPayout: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  // Reload dashboard stats when date range changes
  useEffect(() => {
    if (user && dateRange) {
      // Stats are calculated from filtered sessions, which already react to dateRange changes
      // Just trigger a re-render by updating a state or the filteredSessions will update automatically
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load sessions data
      const sessionsData = await psychologistApi.getSessions({ page: 1, limit: 500 });
      const sessions = sessionsData.data?.sessions || [];
      setAllSessions(sessions);

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message);
      showError(`Failed to load dashboard data: ${err.message}`, 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter by UTC calendar day of booking creation (aligned with finance / admin session lists).
  const filteredSessions = useMemo(() => {
    let filtered = [...allSessions];
    if (dateRange?.all) return filtered;
    if (!hasDateRangeBounds(dateRange)) return filtered;
    const fromYmd = formatIstCalendarYmd(dateRange.from);
    const toYmd = formatIstCalendarYmd(dateRange.to);
    if (!fromYmd || !toYmd) return filtered;
    return filtered.filter((s) => {
      const ymd = sessionBookingCreatedIstYmd(s);
      return ymd && ymd >= fromYmd && ymd <= toYmd;
    });
  }, [allSessions, dateRange]);

  // Calculate stats from filtered sessions
  useEffect(() => {
    if (allSessions.length === 0) return;

    // Calculate session stats
    const istTodayStr = formatIstCalendarYmd(new Date());

    const upcomingSessions = filteredSessions.filter((session) => {
      const sd = session.scheduled_date;
      if (!sd) return false;
      return sd >= istTodayStr && (session.status === 'booked' || session.status === 'rescheduled');
    });

    const completedSessions = filteredSessions.filter(session => {
      return session.status === 'completed';
    });

    // Calculate payout stats
    let incomeEarned = 0; // Commission from completed sessions
    let pendingPayout = 0; // Commission from upcoming sessions

    // Process completed sessions for earned commission
    completedSessions.forEach(session => {
      const sessionPrice = parseFloat(session.price || 0);
      const commissionRate = 0.7; // Default 70% commission
      const commission = session.doctor_commission_amount || (sessionPrice * commissionRate);
      incomeEarned += commission;
    });

    // Process upcoming/booked sessions for pending payout
    upcomingSessions.forEach(session => {
      const sessionPrice = parseFloat(session.price || 0);
      const commissionRate = 0.7; // Default 70% commission
      const commission = sessionPrice * commissionRate;
      pendingPayout += commission;
    });

    setStats({
      totalSessions: filteredSessions.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length
    });

    setPayoutStats({
      incomeEarned: incomeEarned,
      pendingPayout: pendingPayout
    });
  }, [filteredSessions, allSessions.length]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3f2e73] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          {(() => {
            const first = user?.first_name || user?.firstName || '';
            const last = user?.last_name || user?.lastName || '';
            const fallback = user?.name || user?.email || 'Psychologist';
            const display = (first || last) ? `${first} ${last}`.trim() : fallback;
            return (
              <h6 className="font-semibold text-gray-900">{display}</h6>
            );
          })()}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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

      {/* Sessions Stats Row */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#3f2e73]" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.totalSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Upcoming Sessions</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.upcomingSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Completed Sessions</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.completedSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Details Row */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Income Earned</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">
                    {formatCurrency(payoutStats.incomeEarned)}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">Commission from completed sessions</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pending Payout</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">
                    {formatCurrency(payoutStats.pendingPayout)}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">Commission from upcoming sessions</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <p className="font-medium text-gray-900 mb-4">Recent Activity</p>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500">
              Your recent sessions and availability updates will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
