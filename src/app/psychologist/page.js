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
    completedSessions: 0,
    cancelledSessions: 0,
    rescheduledSessions: 0
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

  // Filter by scheduled_date so pending payout and income earned always reflect the
  // Two filter views — the rule for every dashboard in the system:
  //   • createdInRange   — booking_created_at in range. Drives "Total Sessions" (how many
  //                        new bookings happened this month).
  //   • scheduledInRange — scheduled_date in range. Drives Upcoming/Completed/Rescheduled
  //                        (which sessions are happening this month, regardless of when
  //                        they were booked).
  //   • cancelledInRange — booking_created_at in range, since cancellation is a booking
  //                        event and the original scheduled date is often in a future month.
  const fromYmd = useMemo(
    () => (hasDateRangeBounds(dateRange) ? formatIstCalendarYmd(dateRange.from) : null),
    [dateRange]
  );
  const toYmd = useMemo(
    () => (hasDateRangeBounds(dateRange) ? formatIstCalendarYmd(dateRange.to) : null),
    [dateRange]
  );

  const inRange = (ymd) => !!(ymd && fromYmd && toYmd && ymd >= fromYmd && ymd <= toYmd);

  const createdInRange = useMemo(() => {
    if (dateRange?.all) return allSessions;
    if (!fromYmd || !toYmd) return allSessions;
    return allSessions.filter((s) => inRange(sessionBookingCreatedIstYmd(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, dateRange, fromYmd, toYmd]);

  const scheduledInRange = useMemo(() => {
    if (dateRange?.all) return allSessions;
    if (!fromYmd || !toYmd) return allSessions;
    return allSessions.filter((s) => {
      const ymd = s.scheduled_date ? String(s.scheduled_date).slice(0, 10) : null;
      return inRange(ymd);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, dateRange, fromYmd, toYmd]);

  // Kept for any downstream code that still references this variable
  const filteredSessions = scheduledInRange;

  // Calculate stats from filtered sessions
  useEffect(() => {
    if (allSessions.length === 0) return;

    // Upcoming / Completed / Rescheduled — by scheduled_date in range.
    // Cancelled — by booking_created_at in range (cancellation is a booking-level event).
    const upcomingSessions = scheduledInRange.filter((session) => {
      return session.status === 'booked' || session.status === 'rescheduled';
    });

    const completedSessions = scheduledInRange.filter(session => session.status === 'completed');
    const rescheduledSessions = scheduledInRange.filter(session => session.status === 'rescheduled');
    const cancelledSessions = createdInRange.filter(session => session.status === 'cancelled');

    // Calculate payout stats
    let incomeEarned = 0; // Commission from completed sessions
    let pendingPayout = 0; // Commission from upcoming sessions

    // Process completed sessions for earned commission
    // doctor_wallet is computed by backend using commission_history → therapist_commission → doctor_commissions rates
    completedSessions.forEach(session => {
      const wallet = parseFloat(session.doctor_wallet);
      if (!isNaN(wallet) && wallet > 0) {
        incomeEarned += wallet;
      }
    });

    // Process upcoming/booked sessions for pending payout
    upcomingSessions.forEach(session => {
      const wallet = parseFloat(session.doctor_wallet);
      if (!isNaN(wallet) && wallet > 0) {
        pendingPayout += wallet;
      }
    });

    setStats({
      // Total Sessions = sessions BOOKED in this date range (by booking_created_at)
      totalSessions: createdInRange.length,
      // Upcoming = all non-completed sessions relevant to this month (created here OR scheduled here)
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      cancelledSessions: cancelledSessions.length,
      rescheduledSessions: rescheduledSessions.length
    });

    setPayoutStats({
      incomeEarned: incomeEarned,
      pendingPayout: pendingPayout
    });
  }, [createdInRange, scheduledInRange, allSessions.length]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545] mx-auto"></div>
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
      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#025545]" />
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

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.cancelledSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Rescheduled</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.rescheduledSessions}</dd>
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
    </div>
  );
}
