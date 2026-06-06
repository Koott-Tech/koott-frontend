"use client";
import { useState, useEffect } from "react";
import { X, FileText, Calendar, Loader2, User, AlertCircle, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { psychologistApi } from "../lib/backendApi";

export default function SessionCompletionModal({
  isOpen,
  onClose,
  session,
  onSubmit,
  wide = false,
  /** When true (e.g. admin), summary, report, and private notes are optional */
  fieldsOptional = false,
}) {
  const [formData, setFormData] = useState({
    summary: "",
    report: "",
    summary_notes: "",
    completion_date: "",
  });

  // Private note password lock state
  const [hasPassword, setHasPassword] = useState(null); // null = loading, true/false after check
  const [privateUnlocked, setPrivateUnlocked] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [showUnlockPasswordPlain, setShowUnlockPasswordPlain] = useState(false);

  // Default completion_date when session changes
  useEffect(() => {
    if (session && session.scheduled_date) {
      const scheduledDate = new Date(session.scheduled_date);
      const formattedDate = scheduledDate.toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        completion_date: prev.completion_date || formattedDate,
      }));
    }
  }, [session]);

  // Reset lock state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPrivateUnlocked(false);
      setShowUnlockPrompt(false);
      setUnlockPassword("");
      setUnlockError("");
    }
  }, [isOpen]);

  // Check if password is set when modal opens
  useEffect(() => {
    if (isOpen && !fieldsOptional) {
      psychologistApi.getPrivateNotePasswordStatus()
        .then((r) => setHasPassword(!!r?.data?.hasPassword))
        .catch(() => setHasPassword(false));
    }
  }, [isOpen, fieldsOptional]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (fieldsOptional) {
      setErrors(newErrors);
      return true;
    }
    if (!formData.summary.trim()) newErrors.summary = "Required";
    if (!formData.report.trim()) newErrors.report = "Required";
    if (!formData.summary_notes.trim()) newErrors.summary_notes = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        summary: "",
        report: "",
        summary_notes: "",
        completion_date: session?.scheduled_date ? new Date(session.scheduled_date).toISOString().split("T")[0] : "",
      });
      setPrivateUnlocked(false);
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
      completion_date: session?.scheduled_date ? new Date(session.scheduled_date).toISOString().split("T")[0] : "",
    });
    setErrors({});
    setPrivateUnlocked(false);
    onClose();
  };

  const handleUnlockSubmit = async (e) => {
    e?.preventDefault();
    if (!unlockPassword) {
      setUnlockError("Enter your password");
      return;
    }
    setUnlockSubmitting(true);
    setUnlockError("");
    try {
      const r = await psychologistApi.verifyPrivateNotePassword(unlockPassword);
      if (r?.success) {
        setPrivateUnlocked(true);
        setShowUnlockPrompt(false);
        setUnlockPassword("");
      } else {
        setUnlockError(r?.error || r?.message || "Incorrect password");
      }
    } catch (err) {
      setUnlockError(err?.message || "Incorrect password");
    } finally {
      setUnlockSubmitting(false);
    }
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
      <div className={`relative w-full max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-[#025545] to-[#189e4f] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white shadow-inner">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-white tracking-tight leading-tight" role="heading" aria-level={1}>Complete Session</div>
              <p className="text-xs text-white/70 mt-1 font-medium">
                {fieldsOptional ? "Review details and mark as finished." : "Submit session summary and findings"}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all" disabled={isSubmitting} aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {session && (
            <div className="px-8 pt-6">
              <div className="flex items-center gap-6 text-sm font-semibold text-slate-700 bg-slate-50 px-5 py-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  {session.client?.first_name} {session.client?.last_name}
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"} · {formatSessionTime() || "—"}
                </div>
              </div>
            </div>
          )}
          <form id="session-completion-form" onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
            {/* Summary + Report side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Public Summary */}
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    Visible to Client {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                  </label>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md self-start">Will be sent to client via WhatsApp</span>
                </div>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleInputChange("summary", e.target.value)}
                  placeholder="Warm summary the client will receive…"
                  className={`w-full h-24 px-3 py-2.5 border rounded-xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                    errors.summary
                      ? "border-rose-500 ring-4 ring-rose-500/10"
                      : "border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.summary && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.summary}</p>}
              </div>

              {/* Internal Report */}
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    Message to Team {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                  </label>
                  <span className="text-[10px] px-2 py-0.5 border border-transparent self-start opacity-0 pointer-events-none select-none">Spacer</span>
                </div>
                <textarea
                  value={formData.report}
                  onChange={(e) => handleInputChange("report", e.target.value)}
                  placeholder="Observations and recommendations…"
                  className={`w-full h-24 px-3 py-2.5 border rounded-xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                    errors.report
                      ? "border-rose-500 ring-4 ring-rose-500/10"
                      : "border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.report && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.report}</p>}
              </div>
            </div>

            {/* Private Notes — full width below, password-locked */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em] flex items-center gap-1.5">
                  Therapist Notes — Only Visible to You {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                </label>
                {!fieldsOptional && hasPassword === false && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Set a private-notes password from the sessions header first
                  </span>
                )}
              </div>
              <div className={`relative overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                errors.summary_notes
                  ? "border-rose-500 ring-4 ring-rose-500/10"
                  : "border-slate-200 focus-within:border-[#025545] focus-within:ring-4 focus-within:ring-[#025545]/10"
              }`}>
                {!privateUnlocked && !fieldsOptional && (
                  <>
                    <div className="absolute inset-0 p-4 space-y-3 blur-[4px] opacity-40 select-none pointer-events-none bg-slate-50">
                      {formData.summary_notes ? (
                        <div className="text-sm text-slate-800 whitespace-pre-wrap">{formData.summary_notes}</div>
                      ) : (
                        <>
                          <div className="h-2 bg-slate-400 rounded w-3/4 mt-1"></div>
                          <div className="h-2 bg-slate-400 rounded w-full"></div>
                          <div className="h-2 bg-slate-400 rounded w-5/6"></div>
                          <div className="h-2 bg-slate-400 rounded w-1/2"></div>
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] z-10">
                      {hasPassword ? (
                        <button
                          type="button"
                          onClick={() => setShowUnlockPrompt(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#025545] text-white text-xs font-semibold shadow-lg hover:bg-[#012f23] transition-colors"
                        >
                          <Unlock className="h-4 w-4" />
                          Unlock to type
                        </button>
                      ) : hasPassword === false ? (
                        <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                          <Lock className="inline h-3.5 w-3.5 mr-1 text-amber-600" />
                          Set a private-notes password to type here
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Checking…</div>
                      )}
                    </div>
                  </>
                )}
                <textarea
                  value={formData.summary_notes}
                  onChange={(e) => handleInputChange("summary_notes", e.target.value)}
                  placeholder={privateUnlocked || fieldsOptional ? "Private clinical observations only you can read…" : ""}
                  className={`w-full h-28 px-3 py-2.5 resize-none text-sm bg-transparent focus:outline-none ${
                    (!privateUnlocked && !fieldsOptional) ? "opacity-0 select-none pointer-events-none" : ""
                  }`}
                  disabled={isSubmitting || (!privateUnlocked && !fieldsOptional)}
                />
              </div>
              {privateUnlocked && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1"><Unlock className="h-3 w-3" /> Unlocked for this session</p>
              )}
              {errors.summary_notes && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.summary_notes}</p>}
            </div>

            {/* Completion date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  Actual Completion Date <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => handleInputChange("completion_date", e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm transition-all duration-200 focus:outline-none shadow-sm border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all" disabled={isSubmitting}>
            Go Back
          </button>
          <button
            type="submit"
            form="session-completion-form"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#025545] to-[#189e4f] hover:shadow-lg rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" />Finalizing…</>) : "Complete Session"}
          </button>
        </div>

        {/* Unlock password prompt */}
        {showUnlockPrompt && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-6">

              <p className="text-xs text-slate-500 mb-4">Enter your private-notes password to view and edit private notes for this session.</p>
              <form onSubmit={handleUnlockSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type={showUnlockPasswordPlain ? "text" : "password"}
                    autoFocus
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10"
                  />
                  <button type="button" onClick={() => setShowUnlockPasswordPlain((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" tabIndex={-1}>
                    {showUnlockPasswordPlain ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {unlockError && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{unlockError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => { setShowUnlockPrompt(false); setUnlockPassword(""); setUnlockError(""); }} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={unlockSubmitting} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#025545] hover:bg-[#012f23] rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                    {unlockSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
