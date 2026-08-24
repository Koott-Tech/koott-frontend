'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, DollarSign, CreditCard, Save, User, UserCheck, Calendar, Clock, Tag, CheckCircle, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';

export default function AdminEditSessionModal({ 
  isOpen, 
  onClose, 
  session, 
  onUpdateSuccess,
  apiClient = adminApi
}) {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const idsSetRef = useRef(false);
  
  // Session fields state
  const [psychologistId, setPsychologistId] = useState('');
  const [clientId, setClientId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [originalScheduledDate, setOriginalScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [status, setStatus] = useState('');
  const [price, setPrice] = useState('');
  const [therapistCommission, setTherapistCommission] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [sessionCount, setSessionCount] = useState('');
  const [packageSessionNumber, setPackageSessionNumber] = useState('');
  const [packageGroupId, setPackageGroupId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');
  const [report, setReport] = useState('');
  
  // Payment details state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [razorpayOrderId, setRazorpayOrderId] = useState('');
  const [razorpayPaymentId, setRazorpayPaymentId] = useState('');

  // Dropdown data
  const [psychologists, setPsychologists] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchPsychologist, setSearchPsychologist] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Available statuses (only commonly used ones for admin)
  const availableStatuses = [
    { value: 'booked', label: 'Booked' },
    { value: 'pending', label: 'Pending' },
    { value: 'rescheduled', label: 'Reschedule' }, // renamed to match user request
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancellation' }, // renamed to match user request
    { value: 'no_show', label: 'No show' }, // renamed to match user request
    { value: 'refund_request', label: 'Refund Request' } // new status
  ];

  // Load initial data
  useEffect(() => {
    if (isOpen && session) {
      idsSetRef.current = false; // Reset flag when opening new session
      // Reset IDs first
      setPsychologistId('');
      setClientId('');
      
      // Load dropdowns first, then set session data to ensure options are available
      const loadData = async () => {
        await Promise.all([loadPsychologists(), loadClients()]);
        // Wait a bit longer to ensure state is updated
        setTimeout(() => {
          loadSessionData();
        }, 200);
      };
      loadData();
    } else {
      // Reset form when modal closes
      setPsychologistId('');
      setClientId('');
      setSearchPsychologist('');
      setSearchClient('');
      setShowDoctorDropdown(false);
      idsSetRef.current = false;
    }
  }, [isOpen, session]);

  // Handle auto-zero pricing for cancellations and refunds
  useEffect(() => {
    if (status === 'cancelled' || status === 'refund_request') {
      setPrice('0');
    }
  }, [status]);

  // Ensure IDs are set correctly after psychologists/clients load
  useEffect(() => {
    if (isOpen && session && psychologists.length > 0 && clients.length > 0 && !idsSetRef.current) {
      // Get expected IDs from session
      const expectedPsychId = session.psychologist_id || session.psychologist?.id || '';
      const expectedCliId = session.client_id || session.client?.id || '';
      
      let psychSet = false;
      let clientSet = false;
      
      // Verify and set psychologist ID if it exists in list
      if (expectedPsychId) {
        const psychExists = psychologists.some(p => p.id === expectedPsychId);
        if (psychExists) {
          console.log('useEffect: Setting psychologist ID:', expectedPsychId);
          setPsychologistId(expectedPsychId);
          psychSet = true;
        } else {
          console.warn('Psychologist ID not found in list:', expectedPsychId, 'Available:', psychologists.map(p => p.id));
        }
      }
      
      // Verify and set client ID if it exists in list
      if (expectedCliId) {
        const clientExists = clients.some(c => {
          const cId = c.id || c.client_id || c.profile?.id;
          return cId === expectedCliId;
        });
        if (clientExists) {
          console.log('useEffect: Setting client ID:', expectedCliId);
          setClientId(expectedCliId);
          clientSet = true;
        } else {
          console.warn('Client ID not found in list:', expectedCliId, 'Available:', clients.map(c => c.id || c.client_id || c.profile?.id));
        }
      }
      
      if (psychSet && clientSet) {
        idsSetRef.current = true; // Mark as set if both IDs were processed
      }
    }
  }, [isOpen, psychologists.length, clients.length, session?.id]); // Don't include IDs in deps to avoid loops

  const loadSessionData = () => {
    if (!session) return;

    // Set psychologist ID - handle both direct ID and nested object
    const psychId = session.psychologist_id || session.psychologist?.id || '';
    if (psychId) {
      console.log('loadSessionData: Setting psychologist ID to', psychId);
      setPsychologistId(psychId);
    }
    
    // Set client ID - handle both direct ID and nested object
    const cliId = session.client_id || session.client?.id || '';
    if (cliId) {
      console.log('loadSessionData: Setting client ID to', cliId);
      setClientId(cliId);
    }
    
    // Format date for input (YYYY-MM-DD)
    let formattedDate = '';
    if (session.scheduled_date) {
      const date = new Date(session.scheduled_date);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
    }
    setScheduledDate(formattedDate);
    
    // Format original scheduled date for input (YYYY-MM-DD)
    let formattedOriginalDate = '';
    if (session.original_scheduled_date) {
      const origDate = new Date(session.original_scheduled_date);
      if (!isNaN(origDate.getTime())) {
        const year = origDate.getFullYear();
        const month = String(origDate.getMonth() + 1).padStart(2, '0');
        const day = String(origDate.getDate()).padStart(2, '0');
        formattedOriginalDate = `${year}-${month}-${day}`;
      }
    } else if (session.scheduled_date) {
      // If original_scheduled_date is not set, use scheduled_date as default
      formattedOriginalDate = formattedDate;
    }
    setOriginalScheduledDate(formattedOriginalDate);
    
    // Format time for input (HH:MM)
    let formattedTime = '';
    if (session.scheduled_time) {
      // Handle both "HH:MM" and "HH:MM:SS" formats
      const timeParts = session.scheduled_time.split(':');
      if (timeParts.length >= 2) {
        formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
      }
    }
    setScheduledTime(formattedTime);
    
    setStatus(session.status || 'booked');
    setPrice(session.price || '');
    setTherapistCommission(session.therapist_commission || '');
    setSessionType(session.session_type || '');
    setSessionCount(session.session_count || '');
    setPackageSessionNumber(session.package_session_number || '');
    setPackageGroupId(session.package_group_id || '');
    setPackageId(session.package_id || '');
    setNotes(session.notes || '');
    setSummary(session.summary || '');
    setSessionNotes(session.session_notes || '');
    setSessionSummary(session.session_summary || '');
    setReport(session.report || '');

    // Payment details
    if (session.payment) {
      setPaymentMethod(session.payment.payment_method || 'cash');
      setTransactionId(session.payment.transaction_id || '');
      setRazorpayOrderId(session.payment.razorpay_order_id || '');
      setRazorpayPaymentId(session.payment.razorpay_payment_id || '');
    } else {
      setPaymentMethod('cash');
      setTransactionId('');
      setRazorpayOrderId('');
      setRazorpayPaymentId('');
    }
    setError(null);
  };

  const loadPsychologists = async () => {
    try {
      setIsLoadingData(true);
      const response = await (apiClient.getPsychologists
        ? apiClient.getPsychologists({ limit: 1000 })
        : adminApi.getPsychologists({ limit: 1000 }));
      if (response?.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : response.data?.psychologists || response.data?.users || [];
        setPsychologists(list);
      } else {
        console.warn('Failed to load psychologists:', response);
      }
    } catch (err) {
      console.error('Error loading psychologists:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadClients = async () => {
    try {
      setIsLoadingData(true);
      const response = await (apiClient.getClients
        ? apiClient.getClients({ limit: 1000 })
        : adminApi.getUsers({ role: 'client', limit: 1000 }));
      if (response.success) {
        const rawClients = response.data?.clients || response.data?.users || [];
        const clientsWithIds = rawClients.map(user => {
          const clientId = user.profile?.id || user.client_id || user.id;
          const firstName = user.profile?.first_name || user.first_name || '';
          const lastName = user.profile?.last_name || user.last_name || '';
          const email = user.email || user.profile?.email || user.user?.email || '';
          return {
            ...user,
            id: clientId,
            client_id: clientId,
            email,
            display_name: firstName && lastName
              ? `${firstName} ${lastName}`
              : email || 'Unknown'
          };
        });
        setClients(clientsWithIds);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!psychologistId || !clientId || !scheduledDate || !scheduledTime || !status) {
      setError('Please fill in all required fields: Psychologist, Client, Date, Time, and Status');
      return;
    }

    // Check if doctor was changed
    const originalPsychId = session.psychologist_id || session.psychologist?.id || '';
    const doctorChanged = psychologistId !== originalPsychId;

    setIsLoading(true);

    try {
      const updateData = {
        psychologist_id: psychologistId,
        client_id: clientId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: status,
        price: price ? parseFloat(price) : null,
        therapist_commission: therapistCommission ? parseFloat(therapistCommission) : null,
        payment_method: paymentMethod,
        transaction_id: transactionId.trim() || null,
        razorpay_order_id: razorpayOrderId.trim() || null,
        razorpay_payment_id: razorpayPaymentId.trim() || null,
        notify_doctor: doctorChanged, // Flag to send notification to new doctor
        session_type: sessionType || null,
        session_count: sessionCount !== '' && sessionCount !== null ? parseInt(sessionCount, 10) : null,
        package_session_number: packageSessionNumber !== '' && packageSessionNumber !== null ? parseInt(packageSessionNumber, 10) : null,
        package_group_id: packageGroupId.trim() || null,
        package_id: packageId.trim() || null,
        notes: notes.trim() || null,
        summary: summary.trim() || null,
        session_notes: sessionNotes.trim() || null,
        session_summary: sessionSummary.trim() || null,
        report: report.trim() || null
      };

      const existingOriginalDate = session.original_scheduled_date
        ? String(session.original_scheduled_date).slice(0, 10)
        : '';
      if (originalScheduledDate && originalScheduledDate !== existingOriginalDate) {
        updateData.original_scheduled_date = originalScheduledDate;
      }
      
      console.log('Updating session with original_scheduled_date:', updateData.original_scheduled_date);

      const response = await apiClient.updateSession(session.id, updateData);

      if (response.success) {
        const successMsg = doctorChanged 
          ? 'Session updated successfully. Notification sent to the new doctor.'
          : 'Session updated successfully';
        showSuccess(successMsg, 'Update Success');
        if (onUpdateSuccess) {
          onUpdateSuccess(response.data);
        }
        onClose();
      } else {
        setError(response.message || 'Failed to update session');
      }
    } catch (err) {
      console.error('Error updating session:', err);
      setError(err.message || 'Failed to update session');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter psychologists and clients based on search
  const filteredPsychologists = psychologists.filter(psych =>
    `${psych.first_name || ''} ${psych.last_name || ''} ${psych.email || ''}`.toLowerCase().includes(searchPsychologist.toLowerCase())
  );

  const filteredClients = clients.filter(client => {
    const searchLower = searchClient.toLowerCase();
    return (client.display_name || '').toLowerCase().includes(searchLower) ||
           (client.email || '').toLowerCase().includes(searchLower) ||
           (client.profile?.first_name || '').toLowerCase().includes(searchLower) ||
           (client.profile?.last_name || '').toLowerCase().includes(searchLower);
  });

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100 border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-[#025545] to-[#189e4f] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white shadow-inner">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-white tracking-tight leading-tight" role="heading" aria-level={1}>
                Edit Session
              </div>
              <p className="text-xs text-white/70 mt-1 font-medium">
                Refine appointment details and payment parameters
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white/90 uppercase tracking-widest">
              #{session.id?.slice(0, 8)}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 disabled:opacity-50"
              disabled={isLoading}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-slate-50/20">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm font-semibold flex items-center gap-3 animate-pulse">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              {error}
            </div>
          )}

          <div className="space-y-10">
            {/* Psychologist and Client Selection - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Psychologist Display with Assign Button */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="h-4 w-4 text-[#025545]" />
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    Assigned Specialist
                  </label>
                </div>
                
                {/* Current Doctor Display */}
                <div className="group relative">
                  <div className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-sm group-hover:border-[#025545]/30 transition-all">
                    {(() => {
                      if (psychologistId) {
                        const selectedPsych = psychologists.find(p => p.id === psychologistId);
                        if (selectedPsych) {
                          return `${selectedPsych.first_name || ''} ${selectedPsych.last_name || ''}`.trim() || selectedPsych.email || 'Unknown';
                        }
                      }
                      if (session.psychologist) {
                        return `${session.psychologist.first_name || ''} ${session.psychologist.last_name || ''}`.trim() || 
                               session.psychologist.email || 
                               'Specialist';
                      }
                      return 'No specialist assigned';
                    })()}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                    className="mt-3 w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                    disabled={isLoading || isLoadingData}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${showDoctorDropdown ? 'rotate-180' : ''} transition-transform duration-300`} />
                    {showDoctorDropdown ? 'Keep Current' : 'Reassign Specialist'}
                  </button>
                </div>

                {/* Doctor Dropdown (shown when button clicked) */}
                {showDoctorDropdown && (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter by name..."
                        value={searchPsychologist}
                        onChange={(e) => setSearchPsychologist(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-100 rounded-xl bg-slate-50 focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all text-sm outline-none"
                      />
                    </div>
                    <select
                      value={psychologistId}
                      onChange={(e) => {
                        setPsychologistId(e.target.value);
                        if (e.target.value) {
                          setShowDoctorDropdown(false);
                        }
                      }}
                      required
                      className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all text-sm outline-none font-medium cursor-pointer"
                      disabled={isLoading || isLoadingData}
                    >
                      <option value="">Select Specialist</option>
                      {filteredPsychologists.map(psych => (
                        <option key={psych.id} value={psych.id}>
                          {psych.first_name} {psych.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Client Display with Reassign Option */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-[#025545]" />
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    Client Reference
                  </label>
                </div>
                
                {/* Current Client Display */}
                <div className="group relative">
                  <div className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white shadow-sm group-hover:border-[#025545]/30 transition-all">
                    <div className="text-sm font-bold text-slate-900">
                      {(() => {
                        if (clientId && clients.length > 0) {
                          const selectedClient = clients.find(c => (c.id || c.client_id || c.profile?.id) === clientId);
                          if (selectedClient) {
                            return selectedClient.display_name || `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || selectedClient.email || 'Unknown';
                          }
                        }
                        if (session.client) {
                          const clientName = `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim();
                          return clientName || session.client.email || 'Client';
                        }
                        return 'Client';
                      })()}
                    </div>
                    {session.client?.child_name && (
                      <div className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-2">
                        Child: {session.client.child_name} {session.client.child_age ? `(${session.client.child_age}y)` : ''}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                    className="mt-3 w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                    disabled={isLoading || isLoadingData}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${showClientDropdown ? 'rotate-180' : ''} transition-transform duration-300`} />
                    {showClientDropdown ? 'Keep Current' : 'Reassign Client'}
                  </button>
                </div>

                {/* Client Dropdown */}
                {showClientDropdown && (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter by name..."
                        value={searchClient}
                        onChange={(e) => setSearchClient(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-100 rounded-xl bg-slate-50 focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all text-sm outline-none"
                      />
                    </div>
                    <select
                      value={clientId}
                      onChange={(e) => {
                        setClientId(e.target.value);
                        if (e.target.value) {
                          setShowClientDropdown(false);
                        }
                      }}
                      required
                      className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all text-sm outline-none font-medium cursor-pointer"
                      disabled={isLoading || isLoadingData}
                    >
                      <option value="">Select Client</option>
                      {filteredClients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.display_name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Date and Time Group */}
            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-6">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#025545]" />
                Schedule Settings
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Active Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Active Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Original Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-50" />
                    <input
                      type="date"
                      value={originalScheduledDate}
                      onChange={(e) => setOriginalScheduledDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50 text-slate-500 focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Session Type and Package Details Group */}
            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-6">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-[#025545]" />
                Session &amp; Package Metadata
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Session Type
                  </label>
                  <select
                    // A couple PACKAGE is stored as session_type 'couple' with session_count > 1
                    // — there is no separate stored value. That was invisible here: the only
                    // couple option read as a single couple session, so a couple package got
                    // saved as "package", which pays the individual-package rate (₹200 instead
                    // of ₹400 on Irene's 3-pack) and rendered as "Pkg" inside a "Couple Pkg"
                    // series. Surface it as its own choice and keep the storage identical.
                    value={
                      String(sessionType).toLowerCase() === 'couple' && Number(sessionCount) > 1
                        ? 'couple_package'
                        : sessionType
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'couple_package') {
                        setSessionType('couple');
                        // Default to a 3-session pack; the Session Count box stays editable for
                        // 6 / 9 / anything else.
                        if (!(Number(sessionCount) > 1)) setSessionCount('3');
                        return;
                      }
                      setSessionType(v);
                      // Leaving a package type clears the count, so a plain couple or individual
                      // session can't keep a stale count and still read as a package.
                      if (v === 'individual' || v === 'couple' || v === 'free_assessment') {
                        if (Number(sessionCount) > 1) setSessionCount('');
                      }
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                  >
                    <option value="individual">Individual</option>
                    <option value="couple">Couple (single session)</option>
                    <option value="couple_package">Couple Package (set count below)</option>
                    <option value="package">Package Session</option>
                    <option value="free_assessment">Free Assessment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Session Count (e.g. 3 for Package of 3)
                  </label>
                  <input
                    type="number"
                    value={sessionCount}
                    onChange={(e) => setSessionCount(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Package Session Number (e.g. 1, 2, 3)
                  </label>
                  <input
                    type="number"
                    value={packageSessionNumber}
                    onChange={(e) => setPackageSessionNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Package Group ID
                  </label>
                  <input
                    type="text"
                    value={packageGroupId}
                    onChange={(e) => setPackageGroupId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Package Catalog ID
                  </label>
                  <input
                    type="text"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
              </div>
            </div>
            
            {/* Financial and Status Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4 text-[#025545]" />
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    Life-cycle Status
                  </label>
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white shadow-sm font-bold text-sm focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none cursor-pointer"
                  disabled={isLoading}
                >
                  {availableStatuses.map(statusOption => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-[#025545]" />
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                      Gross Price
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-2xl bg-white shadow-sm font-bold text-sm focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                      Commission
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={therapistCommission}
                      onChange={(e) => setTherapistCommission(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-2xl bg-white shadow-sm font-bold text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="p-8 bg-[#025545]/5 border border-[#025545]/10 rounded-[2.5rem] space-y-8">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[#025545] flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  Financial Records
                </div>
                <div className="px-3 py-1 bg-white border border-[#025545]/10 rounded-full text-[10px] font-bold text-[#025545] uppercase tracking-widest">
                  Secure Audit
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Funding Source
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-semibold text-sm outline-none focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all"
                    disabled={isLoading}
                  >
                    <option value="cash">Cash Settlement</option>
                    <option value="card">Card Payment</option>
                    <option value="upi">UPI / Instant Transfer</option>
                    <option value="netbanking">Internet Banking</option>
                    <option value="bank_transfer">Direct Bank Deposit</option>
                    <option value="other">Alternative Method</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Master Reference ID
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-bold text-sm outline-none focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all"
                    placeholder="Enter txn ID"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Razorpay Order
                  </label>
                  <input
                    type="text"
                    value={razorpayOrderId}
                    onChange={(e) => setRazorpayOrderId(e.target.value)}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-mono text-xs focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    placeholder="order_..."
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Razorpay Payment
                  </label>
                  <input
                    type="text"
                    value={razorpayPaymentId}
                    onChange={(e) => setRazorpayPaymentId(e.target.value)}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-mono text-xs focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    placeholder="pay_..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Notes, Summary & Report Section */}
            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-6">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-[#025545]" />
                Notes, Summary &amp; Report
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Session Title/Summary (e.g. Google Calendar event title)
                  </label>
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Booking Notes (Wix/Admin checkout notes)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none min-h-[80px]"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Internal Psychologist Notes (Session notes)
                  </label>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none min-h-[100px]"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Client Summary/Feedback (Session summary shared with client)
                  </label>
                  <textarea
                    value={sessionSummary}
                    onChange={(e) => setSessionSummary(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none min-h-[100px]"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Report URL / PDF / Text
                  </label>
                  <input
                    type="text"
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] transition-all outline-none"
                    disabled={isLoading}
                    placeholder="None"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-100 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            Discard
          </button>
          <button
            type="submit"
            form={undefined /* attached via button below */}
            onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
            disabled={isLoading || isLoadingData}
            className="px-10 py-3 bg-gradient-to-r from-[#025545] to-[#189e4f] text-white rounded-2xl hover:shadow-xl hover:shadow-[#025545]/20 transition-all disabled:opacity-50 disabled:scale-[0.98] flex items-center gap-3 text-sm font-bold active:scale-95 shadow-lg shadow-[#025545]/10"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Synchronizing...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Push Updates</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
