'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Filter,
  Users,
  Loader2,
  BarChart3
} from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';

export default function FinanceRevenue() {
  const { showError } = useNotification();
  const [revenueData, setRevenueData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    loadRevenue();
  }, [dateRange]);

  const loadRevenue = async () => {
    try {
      setIsLoading(true);

      const params = {};
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      const response = await financeApi.getRevenue(params);
      
      if (response.success) {
        setRevenueData(response.data);
      } else {
        showError(response.message || 'Failed to load revenue data', 'Load Error');
      }
    } catch (err) {
      console.error('Failed to load revenue:', err);
      showError('Failed to load revenue data', 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !revenueData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  const revenue = revenueData || {};
  const monthlyBreakdown = revenue.monthly_breakdown || [];
  const doctorBreakdown = revenue.by_doctor || [];
  const typeBreakdown = revenue.by_session_type || [];
  const maxMonthlyRevenue = Math.max(...monthlyBreakdown.map(m => m.revenue || 0), 1);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">Revenue</div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              ₹{(revenue.total_revenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Revenue</p>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              ₹{(revenue.net_revenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#025545]/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-[#025545]" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sessions</p>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {revenue.total_sessions || 0}
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <div className="text-sm font-semibold text-gray-900">Monthly Revenue Breakdown</div>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
              </div>
            ) : monthlyBreakdown.length > 0 ? (
              <div className="space-y-4">
                {monthlyBreakdown.map((month, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{month.month}</span>
                      <span className="font-semibold text-gray-900">₹{(month.revenue || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-[#025545] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${((month.revenue || 0) / maxMonthlyRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <BarChart3 className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No monthly revenue data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Doctor & Session Type Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Doctor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div className="text-sm font-semibold text-gray-900">Revenue by Doctor</div>
              </div>
            </div>
            <div className="p-6">
              {doctorBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {doctorBreakdown.map((doctor, index) => (
                    <div key={doctor.id || index} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doctor.first_name} {doctor.last_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{doctor.session_count || 0} sessions</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">₹{(doctor.revenue || 0).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Session Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="text-sm font-semibold text-gray-900">Revenue by Session Type</div>
              </div>
            </div>
            <div className="p-6">
              {typeBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {typeBreakdown.map((type, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{type.session_type || 'Individual'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{type.session_count || 0} sessions</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">₹{(type.revenue || 0).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
