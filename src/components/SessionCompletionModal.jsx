"use client";
import { useState, useEffect } from "react";
import { X, FileText, Calendar, Loader2, User, AlertCircle, Lock, Unlock, Eye, EyeOff, Paperclip, Trash2 } from "lucide-react";
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
    message_to_operations: "",
    client_opening_statement: "",
    attachments: [],
    // From the therapists' own "Koott-26 Sessions" sheets. Only the columns the form did not
    // already cover are here — "To Operation" and "Condition" map onto message_to_operations
    // and client_opening_statement, which already existed, so they are relabelled rather than
    // duplicated.
    client_status: "",
    therapist_session_sequence: "",
    client_sex: "",
    client_age: "",
    client_age_group: "",
    client_location: "",
    partner_sex: "",
    partner_age_group: "",
    partner_location: "",
    // Intake answers. Session-level: a returning client can answer differently later, so these
    // are asked each time rather than stamped once onto the client record.
    condition: "",
    concern_duration: "",
    therapy_trigger: "",
    therapy_awareness: "",
    tried_therapy_before: "",
    therapy_hesitation: "",
  });

  const AGE_GROUPS = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const CONCERN_DURATIONS = ["Less than 3 months", "3-6 months", "6-12 months", "1+ year"];
  const AWARENESS_LEVELS = ["Very aware", "Somewhat aware", "Not much aware"];
  const TRIED_BEFORE = ["Yes", "No"];

  // Verbatim from the brief, in its numbering. Question 4 (Session Type) is intentionally
  // missing: it is set at booking and shown on the session, so asking again adds nothing.
  const INTAKE_QUESTIONS = [
    { n: 5, field: "condition", label: "Main Concern" },
    { n: 6, field: "concern_duration", label: "How long has the client been experiencing this concern?", options: CONCERN_DURATIONS },
    { n: 7, field: "therapy_trigger", label: "What made them seek therapy at this point?" },
    { n: 8, field: "therapy_awareness", label: "How aware were they about therapy before starting?", options: AWARENESS_LEVELS },
    { n: 9, field: "tried_therapy_before", label: "Have they tried therapy before?", options: TRIED_BEFORE },
    { n: 10, field: "therapy_hesitation", label: "What is one common thought, fear, or hesitation they had about seeking therapy?" },
    { n: 11, field: "client_opening_statement", label: "Opening Statement" },
  ];

  const CLIENT_STATUSES = ["New", "Follow up", "Resumed after a pause"];
  // The therapist's own read on whether this was a first session or a follow-up. The system
  // already works this out for commission (first session per client, or per package), and
  // that stays the source of truth for money — this answer is recorded alongside it and
  // mirrored to the therapist's sheet as a backup, never used to price anything.
  const SESSION_SEQUENCES = [
    { value: "first", label: "First session" },
    { value: "followup", label: "Follow-up" },
  ];
  // Gender / age group / location describe the PERSON, not the session. Asking them at every completion
  // is exactly what makes a form feel like paperwork, so they appear only while the client
  // record still lacks them — for a returning client this whole block never renders.
  const clientRecord = session?.client || {};
  // A couple session has two people in the room but only one client record, so the partner's
  // details are asked alongside. Matches the same shapes finance does — "couple", "Cpl x 3".
  const isCoupleSession = /couple|cpl/i.test(
    `${session?.session_type || ""} ${session?.wix_payload?.bookingType || ""}`
  );
  const needsPartnerDetails = isCoupleSession &&
    (!clientRecord.partner_sex || !clientRecord.partner_age_group || !clientRecord.partner_location);
  const needsClientDetails = !clientRecord.sex ||
    !(clientRecord.age_group || clientRecord.age) || !clientRecord.location;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError("");

    try {
      let uploadRes;
      if (fieldsOptional) {
        const { adminApi } = await import("../lib/backendApi");
        uploadRes = await adminApi.uploadImage(file, { bucket: 'session-attachments' });
      } else {
        uploadRes = await psychologistApi.uploadAttachment(file);
      }

      if (uploadRes?.success) {
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), { url: uploadRes.url, filename: uploadRes.filename || file.name }]
        }));
      } else {
        setUploadError(uploadRes?.error || uploadRes?.message || "Failed to upload file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== indexToRemove)
    }));
  };

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
    // "Message to operations" is required
    if (!formData.message_to_operations.trim()) newErrors.message_to_operations = "Required";
    // Every intake answer is required. Session Type is deliberately absent — it is fixed at
    // booking, so re-asking it would only be a chance to contradict the record.
    const REQUIRED_INTAKE = {
      condition: "Required",
      concern_duration: "Pick one",
      therapy_awareness: "Pick one",
      tried_therapy_before: "Pick one",
      therapy_trigger: "Required",
      therapy_hesitation: "Required",
      client_opening_statement: "Required",
    };
    for (const [field, message] of Object.entries(REQUIRED_INTAKE)) {
      if (!String(formData[field] || "").trim()) newErrors[field] = message;
    }
    // Demographics are only asked when the client record still lacks them.
    if (needsClientDetails) {
      if (!formData.client_sex) newErrors.client_sex = "Required";
      if (!formData.client_age_group) newErrors.client_age_group = "Required";
      if (!String(formData.client_location || "").trim()) newErrors.client_location = "Required";
    }
    // Couple session — the second person's details are required too.
    if (needsPartnerDetails) {
      if (!formData.partner_sex) newErrors.partner_sex = "Required";
      if (!formData.partner_age_group) newErrors.partner_age_group = "Required";
      if (!String(formData.partner_location || "").trim()) newErrors.partner_location = "Required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Build final formatted report text
      const finalReportText = [
        formData.report.trim(),
        formData.message_to_operations?.trim() ? `\n\n--- Message to Operations ---\n${formData.message_to_operations.trim()}` : '',
        formData.client_opening_statement?.trim() ? `\n\n--- Client Opening Statement ---\n${formData.client_opening_statement.trim()}` : '',
        formData.attachments && formData.attachments.length > 0
          ? `\n\n--- Operation Attachments ---\n${formData.attachments.map(att => `- [${att.filename}]: ${att.url}`).join('\n')}`
          : ''
      ].filter(Boolean).join('');

      await onSubmit({
        ...formData,
        report: finalReportText
      });
      setFormData({
        summary: "",
        report: "",
        summary_notes: "",
        completion_date: session?.scheduled_date ? new Date(session.scheduled_date).toISOString().split("T")[0] : "",
        message_to_operations: "",
        client_opening_statement: "",
        attachments: [],
        client_status: "",
        therapist_session_sequence: "",
        client_sex: "",
            client_age: "",
        client_age_group: "",
        client_location: "",
        partner_sex: "",
        partner_age_group: "",
        partner_location: "",
        condition: "",
        concern_duration: "",
        therapy_trigger: "",
        therapy_awareness: "",
        tried_therapy_before: "",
        therapy_hesitation: "",
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
      message_to_operations: "",
      client_opening_statement: "",
      attachments: [],
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
      <div className={`relative w-full h-[92vh] flex flex-col rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
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
        <div className="flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-50">
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
            {/* One tap, no typing — kept first because it is the quickest thing to answer. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em] mr-1">Client</span>
              {CLIENT_STATUSES.map((label) => {
                const active = formData.client_status === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleInputChange("client_status", active ? "" : label)}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-[#025545] text-white border-[#025545]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Asked separately from "Client" above: that describes the PERSON's history with
                Koott, this describes THIS session. Finance derives its own answer for the
                commission rate — this one is the therapist's, kept for the record. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em] mr-1">Session</span>
              {SESSION_SEQUENCES.map(({ value, label }) => {
                const active = formData.therapist_session_sequence === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleInputChange("therapist_session_sequence", active ? "" : value)}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-[#025545] text-white border-[#025545]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Client details FIRST — these were a cramped inline row beside the status
                chips and therapists were missing them entirely. Full-width labelled fields in
                the order the questions were given, so they read as part of the form. Still
                only rendered when the client record actually lacks them. */}
            {(needsClientDetails || needsPartnerDetails) && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    {isCoupleSession ? "Both Clients" : "Client Details"}
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                {/* A couple session has two people in the room, so both sets are asked side by
                    side. For an individual session only the first column renders. */}
                <div className="space-y-4">
                  {[
                    { who: "person", prefix: "client", heading: "Person 1", show: needsClientDetails },
                    { who: "partner", prefix: "partner", heading: "Person 2", show: needsPartnerDetails },
                  ].filter(({ who, show }) => show && (who === "person" || isCoupleSession)).map(({ prefix, heading }) => {
                    const f = (n) => (prefix === "client" ? `client_${n}` : `partner_${n}`);
                    const err = (n) => errors[f(n)];
                    const box = (n) => `w-full px-3 py-2.5 border rounded-xl text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                      err(n) ? "border-rose-500 ring-4 ring-rose-500/10" : "border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                    }`;
                    return (
                      <div key={prefix} className="space-y-2">
                        {isCoupleSession && (
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.08em]">{heading}</div>
                        )}
                        {/* Three narrow fields across one row rather than full-width stacked
                            boxes — a full-width select for an age band looked bloated. */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                            Age Group <span className="text-rose-500 ml-1">*</span>
                          </label>
                          <select
                            value={formData[f("age_group")]}
                            onChange={(e) => handleInputChange(f("age_group"), e.target.value)}
                            disabled={isSubmitting}
                            className={`${box("age_group")} bg-white`}
                          >
                            <option value="">Select age group</option>
                            {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                          {err("age_group") && <p className="text-xs font-semibold text-rose-500">{err("age_group")}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                            Gender <span className="text-rose-500 ml-1">*</span>
                          </label>
                          <select
                            value={formData[f("sex")]}
                            onChange={(e) => handleInputChange(f("sex"), e.target.value)}
                            disabled={isSubmitting}
                            className={`${box("sex")} bg-white`}
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                          {err("sex") && <p className="text-xs font-semibold text-rose-500">{err("sex")}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                            Location <span className="text-rose-500 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData[f("location")]}
                            onChange={(e) => handleInputChange(f("location"), e.target.value)}
                            disabled={isSubmitting}
                            placeholder="City, state or country"
                            className={box("location")}
                          />
                          {err("location") && <p className="text-xs font-semibold text-rose-500">{err("location")}</p>}
                        </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* The intake questions, verbatim and in the order they were given. Numbered so
                the form and the source list stay comparable at a glance; Session Type (4) is
                absent on purpose — it is fixed at booking, so re-asking it only invites a
                contradiction of the record. */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">Intake</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {INTAKE_QUESTIONS.map(({ n, field, label, options }) => (
                <div key={field} className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em] leading-relaxed block">
                    <span className="text-slate-400 mr-1.5">{n}.</span>{label}
                    <span className="text-rose-500 ml-1">*</span>
                  </label>
                  {options ? (
                    <select
                      value={formData[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      disabled={isSubmitting}
                      /* Capped rather than full width: a Yes/No control stretched across the
                         whole modal reads as a mistake. Questions keep their given order. */
                      className={`w-full max-w-xs px-3 py-2.5 border rounded-xl text-sm bg-white transition-all duration-200 focus:outline-none shadow-sm ${
                        errors[field] ? "border-rose-500 ring-4 ring-rose-500/10" : "border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                      }`}
                    >
                      <option value="">Select one</option>
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <textarea
                      value={formData[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      disabled={isSubmitting}
                      className={`w-full h-20 px-3 py-2.5 border rounded-xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                        errors[field] ? "border-rose-500 ring-4 ring-rose-500/10" : "border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                      }`}
                    />
                  )}
                  {errors[field] && <p className="text-xs font-semibold text-rose-500">{errors[field]}</p>}
                </div>
              ))}
            </div>

            {/* Client-visible summary. Sits after the intake so the therapist has the client's
                own words in front of them before summarising back to them. */}
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  Visible to Client {!fieldsOptional && <span className="text-slate-400 ml-1 normal-case font-medium">(optional)</span>}
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

            {/* Message to therapist and Main Concern sit with the client-visible summary:
                all three are the written account of the session, so they are answered together
                rather than split across the form. */}
            {/* Therapist-facing note. The client-visible summary used to sit beside this; it
                now lives further down, below the intake, so the personal details and intake
                answers are captured before anything client-facing is written. */}
            <div className="grid grid-cols-1 gap-5">
              {/* Message to other therapist */}
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                    Message to other therapist <span className="text-slate-400 ml-1 normal-case font-medium">(optional)</span>
                  </label>
                </div>
                <textarea
                  value={formData.report}
                  onChange={(e) => handleInputChange("report", e.target.value)}
                  placeholder="Observations and clinical notes for other therapists..."
                  className="w-full h-24 px-3 py-2.5 border border-slate-200 rounded-xl resize-none text-sm focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10 transition-all duration-200 focus:outline-none shadow-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

              {/* Message to Operation — the Opening Statement that used to sit beside it is
                  now question 11 of the intake block. */}
            <div className="grid grid-cols-1 gap-5">
              {/* Message to operation */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">
                  To Operation {!fieldsOptional && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <textarea
                  value={formData.message_to_operations}
                  onChange={(e) => handleInputChange("message_to_operations", e.target.value)}
                  placeholder="Anything the team should action — follow-up call, booking, payment…"
                  className={`w-full h-24 px-3 py-2.5 border rounded-xl resize-none text-sm transition-all duration-200 focus:outline-none shadow-sm ${
                    errors.message_to_operations
                      ? "border-rose-500 ring-4 ring-rose-500/10"
                      : "border-slate-200 focus:border-[#025545] focus:ring-4 focus:ring-[#025545]/10"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.message_to_operations && <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{errors.message_to_operations}</p>}

                {/* File Upload Attachment */}
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
                      <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                      Attach file
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={isUploading || isSubmitting}
                        className="hidden"
                      />
                    </label>
                    {isUploading && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin text-[#025545]" />
                        Uploading...
                      </span>
                    )}
                  </div>
                  {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}

                  {/* List of Attachments */}
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {formData.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <span className="font-medium text-slate-700 truncate max-w-[200px]" title={att.filename}>{att.filename}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Private Notes — full width below, password-locked */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em] flex items-center gap-1.5">
                  Therapist Notes — Only Visible to You <span className="text-slate-400 ml-1 normal-case font-medium">(optional)</span>
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
            type="button"
            onClick={handleSubmit}
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
