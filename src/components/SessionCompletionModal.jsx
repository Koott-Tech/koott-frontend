"use client";
import { useState, useEffect } from "react";
import { X, FileText, Calendar, Loader2, User, AlertCircle } from "lucide-react";

export default function SessionCompletionModal({ 
  isOpen, 
  onClose, 
  session, 
  onSubmit,
  wide = false,
  /** When true (e.g. admin), summary, report, and private notes are optional */
  fieldsOptional = false
}) {
  // Initialize completion_date with scheduled_date (default to scheduled date)
  const [formData, setFormData] = useState({
    summary: "",
    report: "",
    summary_notes: "",
    completion_date: ""
  });

  // Set default completion_date when session changes
  useEffect(() => {
    if (session && session.scheduled_date) {
      // Format scheduled_date to YYYY-MM-DD for date input
      const scheduledDate = new Date(session.scheduled_date);
      const formattedDate = scheduledDate.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        completion_date: prev.completion_date || formattedDate
      }));
    }
  }, [session]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (fieldsOptional) {
      setErrors(newErrors);
      return true;
    }
    if (!formData.summary.trim()) {
      newErrors.summary = "Summary is required";
    }
    if (!formData.report.trim()) {
      newErrors.report = "Report is required";
    }
    if (!formData.summary_notes.trim()) {
      newErrors.summary_notes = "Summary notes are required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        summary: "",
        report: "",
        summary_notes: "",
        completion_date: session?.scheduled_date ? new Date(session.scheduled_date).toISOString().split('T')[0] : ""
      });
      onClose();
    } catch (error) {
      console.error("Error submitting session completion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      summary: "",
      report: "",
      summary_notes: "",
      completion_date: session?.scheduled_date ? new Date(session.scheduled_date).toISOString().split('T')[0] : ""
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const formatSessionTime = () => {
    if (!session?.scheduled_time) return "";
    const [hours, minutes] = session.scheduled_time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes || "00"} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={isSubmitting ? undefined : handleClose} aria-hidden="true" />
      <div className={`relative w-full max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden transform transition-all duration-300 scale-100 ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-[#3f2e73] to-[#5d44a8] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white shadow-inner">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-white tracking-tight leading-tight" role="heading" aria-level={1}>
                Complete Session
              </div>
              <p className="text-xs text-white/70 mt-1 font-medium">
                {fieldsOptional ? 'Review details and mark as finished.' : 'Submit session summary and findings'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 disabled:opacity-50"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Session Info */}
        {session && (
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3f2e73]"></span>
                Session Context
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Client</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 flex items-center gap-2.5 shadow-sm">
                    <User className="h-4 w-4 text-[#3f2e73]" />
                    {session.client?.first_name} {session.client?.last_name}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Child</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm">
                    {session.client?.child_name || "—"} {session.client?.child_age ? `(${session.client.child_age}y)` : ""}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Appointment</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 flex items-center gap-2.5 shadow-sm">
                    <Calendar className="h-4 w-4 text-[#3f2e73]" />
                    {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : "—"} · {formatSessionTime() || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <form id="session-completion-form" onSubmit={handleSubmit} className="px-8 py-6 space-y-8">
            {/* Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  Session Summary {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Visible to Client</span>
              </div>
              <textarea
                value={formData.summary}
                onChange={(e) => handleInputChange("summary", e.target.value)}
                placeholder="Write a warm, professional summary of the session..."
                className={`w-full h-32 px-4 py-3.5 border rounded-2xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                  errors.summary 
                    ? "border-rose-500 ring-4 ring-rose-500/10" 
                    : "border-slate-200 focus:border-[#3f2e73] focus:ring-4 focus:ring-[#3f2e73]/10"
                }`}
                disabled={isSubmitting}
              />
              {errors.summary && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.summary}</p>}
            </div>

            {/* Report */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  Session Findings {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Visible to Client</span>
              </div>
              <textarea
                value={formData.report}
                onChange={(e) => handleInputChange("report", e.target.value)}
                placeholder="Detail your observations and actionable recommendations..."
                className={`w-full h-32 px-4 py-3.5 border rounded-2xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                  errors.report 
                    ? "border-rose-500 ring-4 ring-rose-500/10" 
                    : "border-slate-200 focus:border-[#3f2e73] focus:ring-4 focus:ring-[#3f2e73]/10"
                }`}
                disabled={isSubmitting}
              />
              {errors.report && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.report}</p>}
            </div>

            {/* Private notes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  Private Clinical Notes {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Admin Only</span>
              </div>
              <textarea
                value={formData.summary_notes}
                onChange={(e) => handleInputChange("summary_notes", e.target.value)}
                placeholder="Record clinical nuances and internal-only context..."
                className={`w-full h-32 px-4 py-3.5 border rounded-2xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                  errors.summary_notes 
                    ? "border-rose-500 ring-4 ring-rose-500/10" 
                    : "border-slate-200 focus:border-[#3f2e73] focus:ring-4 focus:ring-[#3f2e73]/10"
                }`}
                disabled={isSubmitting}
              />
              {errors.summary_notes && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.summary_notes}</p>}
            </div>

            {/* Completion date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  Actual Completion Date <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => handleInputChange("completion_date", e.target.value)}
                    className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                      errors.completion_date 
                        ? "border-rose-500 ring-4 ring-rose-500/10" 
                        : "border-slate-200 focus:border-[#3f2e73] focus:ring-4 focus:ring-[#3f2e73]/10"
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                {errors.completion_date && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.completion_date}</p>}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all duration-200 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Go Back
          </button>
          <button
            type="submit"
            form="session-completion-form"
            disabled={isSubmitting}
            className="px-8 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#3f2e73] to-[#5d44a8] hover:shadow-lg hover:shadow-[#3f2e73]/20 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:scale-[0.98] flex items-center gap-3 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing…
              </>
            ) : (
              "Complete Session"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
