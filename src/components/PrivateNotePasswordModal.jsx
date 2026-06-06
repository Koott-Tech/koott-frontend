"use client";
import { useEffect, useState } from "react";
import { X, Lock, Key, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { psychologistApi } from "../lib/backendApi";

/**
 * Multi-mode modal for managing the therapist's private-notes password.
 * Modes: 'setup' (first time), 'change' (replace existing), 'reset' (forgot — uses login pwd)
 */
export default function PrivateNotePasswordModal({ isOpen, onClose, onSuccess }) {
  const [hasPassword, setHasPassword] = useState(null); // null = loading
  const [mode, setMode] = useState("setup"); // 'setup' | 'change' | 'reset'
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", loginPassword: "" });
  const [showField, setShowField] = useState({ current: false, new: false, confirm: false, login: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(""); setSuccess(""); setForm({ currentPassword: "", newPassword: "", confirmPassword: "", loginPassword: "" });
    psychologistApi.getPrivateNotePasswordStatus()
      .then((r) => {
        const has = !!r?.data?.hasPassword;
        setHasPassword(has);
        setMode(has ? "change" : "setup");
      })
      .catch(() => { setHasPassword(false); setMode("setup"); });
  }, [isOpen]);

  if (!isOpen) return null;

  const onChange = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(""); };
  const toggleShow = (k) => () => setShowField((s) => ({ ...s, [k]: !s[k] }));

  const validate = () => {
    if (form.newPassword.length < 6) return "New password must be at least 6 characters";
    if (form.newPassword !== form.confirmPassword) return "Passwords do not match";
    if (mode === "change" && !form.currentPassword) return "Enter your current password";
    if (mode === "reset" && !form.loginPassword) return "Enter your login password";
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true); setError("");
    try {
      let r;
      if (mode === "setup") {
        r = await psychologistApi.setupPrivateNotePassword(form.newPassword);
      } else if (mode === "change") {
        r = await psychologistApi.changePrivateNotePassword(form.currentPassword, form.newPassword);
      } else {
        r = await psychologistApi.resetPrivateNotePassword(form.loginPassword, form.newPassword);
      }
      if (!r?.success) throw new Error(r?.error || r?.message || "Failed");
      setSuccess(mode === "setup" ? "Password created" : mode === "change" ? "Password changed" : "Password reset");
      setHasPassword(true);
      onSuccess?.();
      setTimeout(() => { onClose?.(); }, 1100);
    } catch (err) {
      setError(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#025545]/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-[#025545]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Private Notes Password</h3>
              <p className="text-[11px] text-slate-500">Used to unlock your private clinical notes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasPassword === null ? (
          <div className="px-6 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
          </div>
        ) : (
          <>
            {hasPassword && (
              <div className="px-6 pt-4 flex gap-1.5 text-[11px] font-medium">
                <button onClick={() => { setMode("change"); setError(""); }} className={`px-2.5 py-1 rounded-md ${mode === "change" ? "bg-[#025545] text-white" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}>Change Password</button>
                <button onClick={() => { setMode("reset"); setError(""); }} className={`px-2.5 py-1 rounded-md ${mode === "reset" ? "bg-amber-600 text-white" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}>Forgot? Reset</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {mode === "setup" && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-800">
                  <Lock className="inline h-3.5 w-3.5 mr-1" /> First time setup — create a password different from your login. You'll use this to unlock private notes.
                </div>
              )}
              {mode === "reset" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                  Forgot your private-notes password? Enter your <strong>login password</strong> below to reset it.
                </div>
              )}

              {mode === "change" && (
                <PasswordField label="Current Password" value={form.currentPassword} onChange={onChange("currentPassword")} show={showField.current} onToggle={toggleShow("current")} />
              )}
              {mode === "reset" && (
                <PasswordField label="Your Login Password" value={form.loginPassword} onChange={onChange("loginPassword")} show={showField.login} onToggle={toggleShow("login")} />
              )}
              <PasswordField label={mode === "setup" ? "New Password" : "New Private-Notes Password"} value={form.newPassword} onChange={onChange("newPassword")} show={showField.new} onToggle={toggleShow("new")} hint="At least 6 characters" />
              <PasswordField label="Confirm New Password" value={form.confirmPassword} onChange={onChange("confirmPassword")} show={showField.confirm} onToggle={toggleShow("confirm")} />

              {error && <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
              {success && <p className="text-xs text-emerald-700 flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />{success}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-3.5 py-2 text-xs font-semibold text-white bg-[#025545] hover:bg-[#012f23] rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {mode === "setup" ? "Create Password" : mode === "change" ? "Change Password" : "Reset Password"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10"
        />
        <button type="button" onClick={onToggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" tabIndex={-1}>
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
