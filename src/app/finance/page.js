'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Receipt,
  CreditCard,
  Percent,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Wallet,
  User,
  Download,
  XCircle,
  RefreshCcw,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { financeApi } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeImageUrl } from '@/utils/urlNormalizer';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DateRangePicker from '@/components/ui/date-range-picker';
import { Filter } from 'lucide-react';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import {
  formatIstCalendarYmd,
  istCalendarMonthBounds,
  istWeekMondayBounds,
  istYearBounds,
} from '@/lib/wixFinanceDates';

/** When range is incomplete: IST month-start → IST today (matches Wix Admin India). */
function financeApiFallbackDateStrings() {
  const { from } = istCalendarMonthBounds(new Date());
  return { from: formatIstCalendarYmd(from), to: formatIstCalendarYmd(new Date()) };
}

export default function FinanceDashboard() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCharts, setShowCharts] = useState(false);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

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

  // Load dashboard data when date range changes (includes initial load) - without charts
  useEffect(() => {
    if (!authLoading && (hasRole('finance') || hasRole('admin') || hasRole('superadmin'))) {
      // Always load - loadDashboardData has fallback for dates
      loadDashboardData(false); // Don't include charts on initial load
      setShowCharts(false); // Reset charts visibility when date range changes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, authLoading]);

  const loadDashboardData = async (includeCharts = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const boundary = (d) => formatIstCalendarYmd(d) || financeApiFallbackDateStrings().from;

      const allTime = !!(dateRange && dateRange.all);
      let dateFrom;
      let dateTo;

      if (allTime) {
        dateFrom = undefined;
        dateTo = undefined;
      } else if (hasDateRangeBounds(dateRange)) {
        dateFrom = boundary(dateRange.from);
        dateTo = boundary(dateRange.to);
      } else {
        const fb = financeApiFallbackDateStrings();
        dateFrom = fb.from;
        dateTo = fb.to;
      }

      if (!allTime) {
        if (!dateFrom || !dateTo || typeof dateFrom !== 'string' || typeof dateTo !== 'string') {
          console.error('CRITICAL ERROR: Dates validation failed!', { dateFrom, dateTo, dateRange, dateFromType: typeof dateFrom, dateToType: typeof dateTo });
          const fb = financeApiFallbackDateStrings();
          dateFrom = fb.from;
          dateTo = fb.to;
        }

        if (dateFrom === undefined || dateTo === undefined) {
          console.error('FATAL ERROR: Dates are still undefined!', { dateFrom, dateTo });
          const fb = financeApiFallbackDateStrings();
          dateFrom = fb.from;
          dateTo = fb.to;
        }
      }

      console.log('Finance dashboard FINAL dates being sent:', { dateFrom, dateTo, dateRange, allTime });

      const response = await financeApi.getDashboard(
        allTime
          ? { allTime: true, includeCharts }
          : { dateFrom, dateTo, includeCharts }
      );
      
      console.log('Finance dashboard API response:', response);
      
      if (response && response.success) {
        console.log('Finance dashboard data received:', response.data);
        setDashboardData(response.data);
      } else {
        console.error('Finance dashboard API error:', response);
        setError(response?.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      console.error('Error details:', err.response || err.message);
      setError(`Failed to load dashboard data: ${err.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChartsData = async () => {
    if (dashboardData?.charts) {
      // Charts already loaded, just show them
      setShowCharts(true);
      return;
    }

    try {
      setIsLoadingCharts(true);
      
      const boundaryCharts = (d) => formatIstCalendarYmd(d) || financeApiFallbackDateStrings().from;

      const allTime = !!(dateRange && dateRange.all);
      let dateFrom;
      let dateTo;

      if (allTime) {
        dateFrom = undefined;
        dateTo = undefined;
      } else if (hasDateRangeBounds(dateRange)) {
        dateFrom = boundaryCharts(dateRange.from);
        dateTo = boundaryCharts(dateRange.to);
      } else {
        const fb = financeApiFallbackDateStrings();
        dateFrom = fb.from;
        dateTo = fb.to;
      }

      if (!allTime) {
        if (!dateFrom || !dateTo || typeof dateFrom !== 'string' || typeof dateTo !== 'string') {
          console.error('CRITICAL: Charts dates validation failed!', { dateFrom, dateTo, dateRange });
          const fb = financeApiFallbackDateStrings();
          dateFrom = fb.from;
          dateTo = fb.to;
        }
      }

      console.log('Finance charts FINAL dates being sent:', { dateFrom, dateTo, allTime });

      const response = await financeApi.getDashboard(
        allTime
          ? { allTime: true, includeCharts: true }
          : { dateFrom, dateTo, includeCharts: true }
      );
      
      if (response.success && response.data?.charts) {
        // Merge charts data into existing dashboard data
        setDashboardData(prev => ({
          ...prev,
          charts: response.data.charts
        }));
        setShowCharts(true);
      }
    } catch (err) {
      console.error('Failed to load charts data:', err);
    } finally {
      setIsLoadingCharts(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#025545' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => loadDashboardData(false)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.summary || {};
  const recentSessions = dashboardData?.recent_sessions || [];
  const topDoctors = dashboardData?.top_doctors || [];
  const monthlyRevenue = dashboardData?.monthly_revenue || [];
  const charts = dashboardData?.charts || null;
  
  // Prepare chart data (only if charts are loaded)
  const revenueByTypeData = charts?.revenueByType ? [
    { name: 'Individual', value: charts.revenueByType.individual || 0 },
    { name: 'Package', value: charts.revenueByType.package || 0 }
  ].filter(item => item.value > 0) : [];
  
  const commissionBreakdownData = charts?.commissionBreakdown ? [
    { name: 'Company Commission', value: charts.commissionBreakdown.company || 0 },
    { name: 'Doctor Wallet', value: charts.commissionBreakdown.doctor || 0 }
  ].filter(item => item.value > 0) : [];
  
  const expenseByCategoryData = charts?.expenseByCategory || [];
  
  const monthlyRevenueChart = charts?.monthlyRevenue || [];
  const monthlyExpensesChart = charts?.monthlyExpenses || [];
  const monthlyCommissionChart = charts?.monthlyCommission || [];
  const monthlyDoctorWalletChart = charts?.monthlyDoctorWallet || [];
  
  // Combine monthly data for comparison chart
  const monthlyComparisonData = monthlyRevenueChart.length > 0 ? monthlyRevenueChart.map((rev, idx) => ({
    month: rev.month,
    revenue: rev.revenue,
    expenses: monthlyExpensesChart[idx]?.expenses || 0,
    commission: monthlyCommissionChart[idx]?.commission || 0,
    doctorWallet: monthlyDoctorWalletChart[idx]?.wallet || 0
  })) : [];
  
  // Chart colors
  const COLORS = ['#025545', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Export functionality
  const exportToExcel = async (period) => {
    try {
      const exportLoading = true; // Don't use setIsLoading to avoid affecting dashboard
      
      // Calculate date range based on period
      let dateFrom;
      let dateTo;

      if (period === 'weekly') {
        const { from } = istWeekMondayBounds(new Date());
        dateFrom = formatIstCalendarYmd(from);
        dateTo = formatIstCalendarYmd(new Date());
      } else if (period === 'monthly') {
        const { from, to } = istCalendarMonthBounds(new Date());
        dateFrom = formatIstCalendarYmd(from);
        dateTo = formatIstCalendarYmd(to);
      } else if (period === 'yearly') {
        const { from, to } = istYearBounds(new Date());
        dateFrom = formatIstCalendarYmd(from);
        dateTo = formatIstCalendarYmd(to);
      } else {
        if (hasDateRangeBounds(dateRange)) {
          dateFrom = formatIstCalendarYmd(dateRange.from);
          dateTo = formatIstCalendarYmd(dateRange.to);
        } else if (dateRange?.all) {
          dateFrom = null;
          dateTo = null;
        } else {
          const fb = financeApiFallbackDateStrings();
          dateFrom = fb.from;
          dateTo = fb.to;
        }
      }

      // Fetch all sessions for the period (no pagination limit)
      let allSessions = [];
      let page = 1;
      const limit = 1000; // Fetch in batches
      let hasMore = true;

      while (hasMore) {
        try {
          const sessionParams = { page, limit };
          if (dateFrom && dateTo) {
            sessionParams.dateFrom = dateFrom;
            sessionParams.dateTo = dateTo;
          }
          const response = await financeApi.getSessions(sessionParams);

          if (response.success && response.data?.sessions) {
            // Validate and clean session data
            const validSessions = response.data.sessions.filter(s => s && s.id);
            allSessions = [...allSessions, ...validSessions];
            const total = response.data.pagination?.total || 0;
            hasMore = allSessions.length < total && validSessions.length > 0;
            page++;
          } else {
            console.warn('API response issue:', response);
            hasMore = false;
          }
        } catch (error) {
          console.error('Error fetching sessions for export:', error);
          hasMore = false;
        }
      }

      // Log summary of fetched data
      console.log(`Fetched ${allSessions.length} sessions for export`);
      if (allSessions.length > 0) {
        const sessionsWithClient = allSessions.filter(s => s.client).length;
        const sessionsWithCommission = allSessions.filter(s => s.commission_amount > 0).length;
        console.log(`Sessions with client data: ${sessionsWithClient}/${allSessions.length}`);
        console.log(`Sessions with commission: ${sessionsWithCommission}/${allSessions.length}`);
      }

      // Helper function to convert 24-hour time to 12-hour format with AM/PM
      const convertTo12Hour = (time24) => {
        if (!time24 || typeof time24 !== 'string') return '';
        const [hours, minutes] = time24.split(':');
        if (!hours || !minutes) return time24;
        const hour24 = parseInt(hours, 10);
        if (isNaN(hour24)) return time24;
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
      };

      // Helper function to get client name properly
      const getClientName = (session) => {
        // Check multiple possible locations for client data
        const client = session.client || session.client_data || null;
        if (!client) {
          // Try to get from nested structure
          if (session.client_id && typeof session.client_id === 'object') {
            return session.client_id.child_name || 
                   `${session.client_id.first_name || ''} ${session.client_id.last_name || ''}`.trim() || 
                   'N/A';
          }
          return 'N/A';
        }
        
        // Prefer child_name, then first_name + last_name
        if (client.child_name && client.child_name.trim() !== '' && client.child_name !== 'null') {
          return client.child_name.trim();
        }
        const firstName = client.first_name || '';
        const lastName = client.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName || 'N/A';
      };

      // Helper function to get commission status
      const getCommissionStatus = (session) => {
        // Check if commission exists and has payment_status
        const paymentStatus = session.commission_payment_status || session.payment_status || null;
        if (paymentStatus) {
          return paymentStatus === 'paid' ? 'Payout' : 'Pending';
        }
        // If commission_amount exists but no status, assume pending
        const commissionAmount = session.commission_amount || session.commission || 0;
        if (commissionAmount && parseFloat(commissionAmount) > 0) {
          return 'Pending';
        }
        return 'N/A';
      };


      // Comprehensive data analysis - check what's missing
      if (allSessions.length > 0) {
        console.log('=== EXPORT DATA ANALYSIS ===');
        console.log(`Total sessions fetched: ${allSessions.length}`);
        
        // Analyze each field
        const analysis = {
          sessionsWithClient: 0,
          sessionsWithClientName: 0,
          sessionsWithChildName: 0,
          sessionsWithPsychologist: 0,
          sessionsWithPsychologistName: 0,
          sessionsWithCommission: 0,
          sessionsWithCommissionStatus: 0,
          sessionsWithDate: 0,
          sessionsWithTime: 0,
          sessionsWithAmount: 0,
          sessionsWithStatus: 0,
          sessionsWithSessionType: 0,
          sessionsWithPaymentId: 0,
          emptyFields: {
            client: [],
            psychologist: [],
            commission: [],
            date: [],
            time: [],
            amount: [],
            status: [],
            sessionType: []
          }
        };

        allSessions.forEach((session, index) => {
          // Client analysis
          if (session.client) {
            analysis.sessionsWithClient++;
            if (session.client.child_name && session.client.child_name.trim() && session.client.child_name !== 'null') {
              analysis.sessionsWithChildName++;
            } else if (session.client.first_name || session.client.last_name) {
              analysis.sessionsWithClientName++;
            } else {
              analysis.emptyFields.client.push({ index, sessionId: session.id, client: session.client });
            }
          } else {
            analysis.emptyFields.client.push({ index, sessionId: session.id, reason: 'No client object' });
          }

          // Psychologist analysis
          if (session.psychologist) {
            analysis.sessionsWithPsychologist++;
            if (session.psychologist.first_name || session.psychologist.last_name) {
              analysis.sessionsWithPsychologistName++;
            } else {
              analysis.emptyFields.psychologist.push({ index, sessionId: session.id, psychologist: session.psychologist });
            }
          } else {
            analysis.emptyFields.psychologist.push({ index, sessionId: session.id, reason: 'No psychologist object' });
          }

          // Commission analysis
          if (session.commission_amount && parseFloat(session.commission_amount) > 0) {
            analysis.sessionsWithCommission++;
          } else {
            analysis.emptyFields.commission.push({ 
              index, 
              sessionId: session.id, 
              commission_amount: session.commission_amount,
              commission_payment_status: session.commission_payment_status,
              company_revenue: session.company_revenue
            });
          }

          if (session.commission_payment_status) {
            analysis.sessionsWithCommissionStatus++;
          }

          // Date/Time analysis
          if (session.session_date || session.scheduled_date) {
            analysis.sessionsWithDate++;
          } else {
            analysis.emptyFields.date.push({ index, sessionId: session.id });
          }

          if (session.scheduled_time) {
            analysis.sessionsWithTime++;
          } else {
            analysis.emptyFields.time.push({ index, sessionId: session.id });
          }

          // Amount analysis
          if (session.amount || session.price) {
            analysis.sessionsWithAmount++;
          } else {
            analysis.emptyFields.amount.push({ index, sessionId: session.id, amount: session.amount, price: session.price });
          }

          // Status analysis
          if (session.status) {
            analysis.sessionsWithStatus++;
          } else {
            analysis.emptyFields.status.push({ index, sessionId: session.id });
          }

          // Session type analysis
          if (session.session_type) {
            analysis.sessionsWithSessionType++;
          } else {
            analysis.emptyFields.sessionType.push({ index, sessionId: session.id });
          }

          // Payment ID
          if (session.payment_id) {
            analysis.sessionsWithPaymentId++;
          }
        });

        console.log('=== FIELD COMPLETENESS ===');
        console.log(`Client data: ${analysis.sessionsWithClient}/${allSessions.length} (${Math.round(analysis.sessionsWithClient/allSessions.length*100)}%)`);
        console.log(`  - With child_name: ${analysis.sessionsWithChildName}`);
        console.log(`  - With first/last name: ${analysis.sessionsWithClientName}`);
        console.log(`Psychologist data: ${analysis.sessionsWithPsychologist}/${allSessions.length} (${Math.round(analysis.sessionsWithPsychologist/allSessions.length*100)}%)`);
        console.log(`Commission data: ${analysis.sessionsWithCommission}/${allSessions.length} (${Math.round(analysis.sessionsWithCommission/allSessions.length*100)}%)`);
        console.log(`Commission status: ${analysis.sessionsWithCommissionStatus}/${allSessions.length}`);
        console.log(`Date: ${analysis.sessionsWithDate}/${allSessions.length}`);
        console.log(`Time: ${analysis.sessionsWithTime}/${allSessions.length}`);
        console.log(`Amount: ${analysis.sessionsWithAmount}/${allSessions.length}`);
        console.log(`Status: ${analysis.sessionsWithStatus}/${allSessions.length}`);
        console.log(`Session Type: ${analysis.sessionsWithSessionType}/${allSessions.length}`);
        console.log(`Payment ID: ${analysis.sessionsWithPaymentId}/${allSessions.length}`);

        // Show sample of empty fields
        console.log('=== EMPTY FIELD SAMPLES (first 5 of each) ===');
        Object.keys(analysis.emptyFields).forEach(field => {
          if (analysis.emptyFields[field].length > 0) {
            console.log(`${field} empty in ${analysis.emptyFields[field].length} sessions:`, analysis.emptyFields[field].slice(0, 5));
          }
        });

        // Show first 3 full session objects for detailed inspection
        console.log('=== FULL SESSION DATA (first 3) ===');
        allSessions.slice(0, 3).forEach((s, i) => {
          console.log(`Session ${i + 1} (ID: ${s.id}):`, JSON.stringify(s, null, 2));
        });
      }

      // Validate and prepare data for Excel
      const excelData = allSessions.map((session, index) => {
        if (!session) {
          return {
            'Session ID': 'N/A',
            'Date': 'N/A',
            'Time': 'N/A',
            'Client Name': 'N/A',
            'Psychologist': 'N/A',
            'Session Type': 'N/A',
            'Status': 'N/A',
            'Amount (₹)': '0.00',
            'Commission (₹)': '0.00',
            'Commission Status': 'N/A',
            'Company Revenue (₹)': '0.00',
            'Net Company Revenue (₹)': '0.00',
            'Payment ID': 'N/A'
          };
        }

        // Get client name with comprehensive fallback
        let clientName = 'N/A';
        const client = session.client || null;
        if (client) {
          // Check child_name first (for child clients)
          if (client.child_name && 
              typeof client.child_name === 'string' && 
              client.child_name.trim() !== '' && 
              client.child_name.toLowerCase() !== 'null' && 
              client.child_name.toLowerCase() !== 'pending' &&
              client.child_name !== 'undefined') {
            clientName = client.child_name.trim();
          } 
          // Fallback to first_name + last_name
          else {
            const firstName = (client.first_name || '').trim();
            const lastName = (client.last_name || '').trim();
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName && 
                fullName.toLowerCase() !== 'pending' && 
                fullName.toLowerCase() !== 'null' &&
                fullName !== 'undefined') {
              clientName = fullName;
            }
          }
        }

        // Get psychologist name
        let psychologistName = 'N/A';
        const psychologist = session.psychologist || null;
        if (psychologist) {
          const firstName = (psychologist.first_name || '').trim();
          const lastName = (psychologist.last_name || '').trim();
          const fullName = `Dr. ${firstName} ${lastName}`.trim();
          if (fullName && fullName !== 'Dr.') {
            psychologistName = fullName;
          }
        }

        // Get session date
        const sessionDate = session.session_date || session.scheduled_date || '';
        
        // Get session time
        const sessionTime = convertTo12Hour(session.scheduled_time || '');
        
        // Get session type
        const sessionType = session.session_type || 'Individual';
        
        // Get status
        const status = session.status || '';
        
        // Get amount/price
        const amount = parseFloat(session.amount || session.price || 0);
        
        // Get payment ID
        const paymentId = session.payment_id || '';
        
        // Calculate payout amounts based on commission payment status
        // Upcoming Payout: commission_amount where payment_status is 'pending' or null
        // Payout: commission_amount where payment_status is 'paid'
        let upcomingPayout = 0;
        let payout = 0;
        
        const commissionAmount = parseFloat(session.commission_amount || 0);
        const paymentStatus = session.commission_payment_status || session.payment_status || null;
        
        if (commissionAmount > 0) {
          if (paymentStatus === 'paid') {
            payout = commissionAmount;
          } else {
            // pending, null, or any other status means upcoming
            upcomingPayout = commissionAmount;
          }
        }

        // Track missing data for this session
        const missingFields = [];
        if (clientName === 'N/A') missingFields.push('Client Name');
        if (psychologistName === 'N/A') missingFields.push('Psychologist');
        if (!sessionDate) missingFields.push('Date');
        if (!sessionTime) missingFields.push('Time');
        if (amount === 0) missingFields.push('Amount');
        if (!status) missingFields.push('Status');
        if (!sessionType) missingFields.push('Session Type');
        if (!paymentId) missingFields.push('Payment ID');

        // Log if this session has missing critical fields (first 10 only to avoid spam)
        if (missingFields.length > 0 && index < 10) {
          console.warn(`Session ${session.id} missing fields:`, missingFields, {
            hasClient: !!session.client,
            client: session.client,
            hasPsychologist: !!session.psychologist,
            psychologist: session.psychologist,
            commission_amount: session.commission_amount,
            commission_payment_status: session.commission_payment_status
          });
        }

        return {
          'Session ID': session.id || '',
          'Date': sessionDate,
          'Time': sessionTime,
          'Client Name': clientName,
          'Psychologist': psychologistName,
          'Session Type': sessionType,
          'Status': status,
          'Amount (₹)': amount.toFixed(2),
          'Upcoming Payout (₹)': upcomingPayout.toFixed(2),
          'Payout (₹)': payout.toFixed(2),
          'Payment ID': paymentId
        };
      });

      // Final summary before export
      const totalRows = excelData.length;
      const rowsWithAllFields = excelData.filter(row => 
        row['Client Name'] !== 'N/A' && 
        row['Psychologist'] !== 'N/A' && 
        row['Date'] !== '' && 
        row['Time'] !== '' &&
        row['Amount (₹)'] !== '0.00'
      ).length;
      
      console.log('=== EXPORT SUMMARY ===');
      console.log(`Total rows: ${totalRows}`);
      console.log(`Rows with all critical fields: ${rowsWithAllFields} (${Math.round(rowsWithAllFields/totalRows*100)}%)`);
      console.log(`Rows missing data: ${totalRows - rowsWithAllFields}`);
      
      if (rowsWithAllFields < totalRows) {
        console.warn('⚠️ Some rows have missing data. Check the warnings above for details.');
      }

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sessions');

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Session ID
        { wch: 12 }, // Date
        { wch: 12 }, // Time
        { wch: 20 }, // Client Name
        { wch: 25 }, // Psychologist
        { wch: 15 }, // Session Type
        { wch: 12 }, // Status
        { wch: 12 }, // Amount
        { wch: 18 }, // Upcoming Payout
        { wch: 15 }, // Payout
        { wch: 15 }  // Payment ID
      ];
      ws['!cols'] = colWidths;

      // Generate filename
      const periodLabel = period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : period === 'yearly' ? 'Yearly' : 'Custom';
      const rangeLabel = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'all-dates';
      const filename = `Finance_Sessions_${periodLabel}_${rangeLabel}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Export Button Component
  const ExportButton = ({ dateRange }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
        
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    exportToExcel('weekly');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Weekly Export
                </button>
                <button
                  onClick={() => {
                    exportToExcel('monthly');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Monthly Export
                </button>
                <button
                  onClick={() => {
                    exportToExcel('yearly');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Yearly Export
                </button>
                <button
                  onClick={() => {
                    exportToExcel('custom');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-200"
                >
                  Custom Range Export
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const StatCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      red: 'bg-red-50 text-red-600',
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{value}</h3>
          <div className="flex items-center gap-2">
            {change && (
              <div className={`flex items-center text-sm ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                {changeType === 'increase' ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                {change}
              </div>
            )}
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 px-2 pt-1 pb-2 sm:px-3 sm:pt-2 sm:pb-3 lg:px-4 lg:pt-3 lg:pb-4">
      <div className="max-w-7xl mx-auto">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2 sm:mb-3">
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

        {/* Header */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div role="heading" aria-level="2" className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2">Finance Dashboard</div>
            <p className="text-xs sm:text-sm text-gray-600">Overview of financial performance and key metrics</p>
          </div>
          <ExportButton dateRange={dateRange} />
        </div>

        {/* Row 1: Session Status Counts - full width */}
        <div className="w-full -mx-2 sm:-mx-3 lg:-mx-4 px-2 sm:px-3 lg:px-4 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 w-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total</span>
                <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-semibold text-gray-900">{stats.total_sessions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Pending</span>
                <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-semibold text-yellow-700">{stats.pending_sessions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Completed</span>
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-semibold text-green-700">{stats.completed_sessions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Rescheduled</span>
                <ArrowRightLeft className="h-5 w-5 text-purple-400 flex-shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-semibold text-purple-700">{stats.rescheduled_sessions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">No Show</span>
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-semibold text-red-700">{stats.no_show_sessions || 0}</p>
            </div>
          </div>
        </div>

        {/* Row 2: Revenue, Profit, Doctor Wallet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Total Revenue"
            value={`₹${Math.round(stats.total_revenue || 0).toLocaleString('en-IN')}`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Net Profit"
            value={`₹${Math.round(stats.net_profit || 0).toLocaleString('en-IN')}`}
            icon={TrendingUp}
            color="purple"
          />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">₹{Math.round(stats.total_doctor_wallet || 0).toLocaleString('en-IN')}</h3>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Doctor Total Wallet</p>
          </div>
        </div>

        {/* Row 3: Payouts, Refunds and Expenses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg sm:text-xl font-semibold text-orange-700">₹{Math.round(stats.pending_payouts || 0).toLocaleString('en-IN')}</h3>
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Pending Payout</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg sm:text-xl font-semibold text-green-700">₹{Math.round(stats.payout || 0).toLocaleString('en-IN')}</h3>
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Payout</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg sm:text-xl font-semibold text-rose-700">₹{Math.round(stats.refund_total || 0).toLocaleString('en-IN')}</h3>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <RefreshCcw className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Refund</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg sm:text-xl font-semibold text-red-700">₹{Math.round(stats.total_expenses || 0).toLocaleString('en-IN')}</h3>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Total Expenses</p>
          </div>
        </div>

        {/* Charts Section Toggle */}
        {!showCharts && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[20px] font-medium text-gray-900 mb-1">Charts & Graphs</div>
                <p className="text-xs text-gray-600">View detailed analytics and visualizations</p>
              </div>
              <button
                onClick={loadChartsData}
                disabled={isLoadingCharts}
                className="flex items-center gap-2 px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingCharts ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>Show Graphs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Pie Charts Row */}
        {showCharts && dashboardData?.charts && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Revenue by Type Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 overflow-visible min-h-[240px]">
            <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900 mb-4">Revenue by Type</div>
            {revenueByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220} minHeight={220} className="overflow-visible">
                <PieChart margin={{ top: 10, right: 60, bottom: 10, left: 60 }}>
                  <Pie
                    data={revenueByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={{ strokeWidth: 1 }}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No revenue data</p>
            )}
          </div>

          {/* Commission Breakdown Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 overflow-visible min-h-[240px]">
            <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900 mb-4">Commission Breakdown</div>
            {commissionBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220} minHeight={220} className="overflow-visible">
                <PieChart margin={{ top: 10, right: 60, bottom: 10, left: 60 }}>
                  <Pie
                    data={commissionBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={{ strokeWidth: 1 }}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {commissionBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No commission data</p>
            )}
          </div>

          {/* Expense by Category Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 overflow-visible min-h-[240px]">
            <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900 mb-4">Expenses by Category</div>
            {expenseByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220} minHeight={220} className="overflow-visible">
                <PieChart margin={{ top: 10, right: 60, bottom: 10, left: 60 }}>
                  <Pie
                    data={expenseByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={{ strokeWidth: 1 }}
                    label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {expenseByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No expense data</p>
            )}
          </div>
        </div>
        )}

        {/* Line/Bar Charts Row */}
        {showCharts && dashboardData?.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Monthly Revenue vs Expenses Line Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900 mb-4">Revenue vs Expenses Trend</div>
            {monthlyComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <LineChart data={monthlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Monthly Commission vs Doctor Wallet Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900 mb-4">Commission vs Doctor Wallet</div>
            {monthlyComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <BarChart data={monthlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Legend />
                  <Bar dataKey="commission" fill="#025545" name="Company Commission" />
                  <Bar dataKey="doctorWallet" fill="#10b981" name="Doctor Wallet" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>
        </div>
        )}

        {/* Top Doctors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900 mb-4">Top Earning Doctors</div>
          {topDoctors.length > 0 ? (
            <div className="space-y-4">
              {topDoctors.map((doctor, index) => (
                <div key={doctor.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[#025545] text-white flex items-center justify-center font-semibold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {doctor.first_name} {doctor.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{doctor.session_count || 0} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{(doctor.total_commission || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500">Commission</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No doctor data available</p>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div role="heading" aria-level="3" className="text-sm font-medium text-gray-900">Recent Bookings</div>
            <a
              href="/finance/sessions"
              className="text-sm text-[#025545] hover:underline font-medium"
            >
              View All
            </a>
          </div>
          {recentSessions.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Session Details</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Doctor</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Client</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Price</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Comm.</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {recentSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900">
                                {session.wix_order_number ? `#${session.wix_order_number}` : (session.source === 'wix' ? 'Wix' : `ID: ${session.id?.slice(0, 6)}`)}
                              </span>
                              {session.source === 'wix' ? (
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-100">WIX</span>
                              ) : (
                                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded border border-indigo-100">PLATFORM</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                              {new Date(session.session_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at {session.scheduled_time?.slice(0, 5)}
                            </div>
                            <div className="mt-1">
                              {session.package_session_number ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-800">
                                  {session.package_session_number} of {session.session_count || '?'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-800 uppercase">
                                  {session.session_type || 'Individual'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {session.psychologist?.first_name} {session.psychologist?.last_name}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {session.client?.first_name} {session.client?.last_name}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-bold text-gray-900">
                          ₹{(session.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right text-gray-600">
                          ₹{(session.commission_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center">
                          {session.status === 'completed' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </span>
                          ) : session.status === 'refunded' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              <RefreshCcw className="h-3 w-3 mr-1" />
                              Refunded
                            </span>
                          ) : session.status === 'pending' || session.status === 'booked' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              {session.status === 'booked' ? 'Booked' : 'Pending'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                              {session.status}
                            </span>
                          )}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent bookings</p>
          )}
        </div>
      </div>
    </div>
  );
}
