"use client";

import { useEffect, useState } from "react";
import { X, EyeOff, Lock, Unlock, AlertCircle, Eye } from "lucide-react";
import { psychologistApi } from "../lib/backendApi";

function getClientLabel(session) {
  const fullName = `${session?.client?.first_name || ""} ${session?.client?.last_name || ""}`.trim();
  return fullName || session?.client?.child_name || "—";
}

function parseTherapistReport(text) {
  if (!text) return { main: '', operations: '', clientStatement: '', attachments: [] };
  const opsMatch = text.match(/---\s*Message to Operations\s*---([\s\S]*?)(?:---|$)/);
  const clientMatch = text.match(/---\s*Client Opening Statement\s*---([\s\S]*?)(?:---|$)/);
  const attachMatch = text.match(/---\s*Operation Attachments\s*---([\s\S]*?)(?:---|$)/);
  const reportMatch = text.match(/---\s*Report\s*---([\s\S]*?)(?:---|$)/);
  let main = text.split(/---/)[0].trim();
  if (!main && reportMatch) main = reportMatch[1].trim();
  const attachLines = attachMatch ? attachMatch[1].trim().split('\n').filter(Boolean) : [];
  const attachments = attachLines.map(line => {
    const m = line.match(/^-\s*\[([^\]]+)\]:\s*(.+)$/);
    return m ? { name: m[1], url: m[2].trim() } : { name: line.replace(/^-\s*/, ''), url: null };
  });
  return { main, operations: opsMatch ? opsMatch[1].trim() : '', clientStatement: clientMatch ? clientMatch[1].trim() : '', attachments };
}

export default function SessionNotesModal({ isOpen, onClose, session }) {
  const [hasPassword, setHasPassword] = useState(null);
  const [privateUnlocked, setPrivateUnlocked] = useState(false);
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPlain, setShowPlain] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrivateUnlocked(false);
      setShowPrompt(false);
      setPassword("");
      setUnlockError("");
      psychologistApi.getPrivateNotePasswordStatus()
        .then((r) => setHasPassword(!!r?.data?.hasPassword))
        .catch(() => setHasPassword(false));
    }
  }, [isOpen, session?.id]);

  if (!isOpen || !session) return null;

  const therapistName = session.psychologist_name || "Therapist";
  const clientName = getClientLabel(session);
  const parsed = parseTherapistReport(session.report || session.session_notes);
  const privateValue = session.summary_notes || session.session_notes;

  const handleUnlockSubmit = async (e) => {
    e?.preventDefault();
    if (!password) { setUnlockError("Enter your password"); return; }
    setSubmitting(true); setUnlockError("");
    try {
      const r = await psychologistApi.verifyPrivateNotePassword(password);
      if (r?.success) {
        setPrivateUnlocked(true);
        setShowPrompt(false);
        setPassword("");
      } else {
        setUnlockError(r?.error || "Incorrect password");
      }
    } catch (err) {
      setUnlockError(err?.message || "Incorrect password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Session Notes</p>
            <p className="text-xs text-gray-400 mt-0.5">{therapistName} · {clientName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          
          {/* Visible to Client */}
          {session.summary && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Visible to Client</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{session.summary}</p>
            </div>
          )}

          {/* Message to other therapist */}
          {parsed.main && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Message to other therapist</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.main}</p>
            </div>
          )}

          {/* Client Opening Statement */}
          {parsed.clientStatement && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1.5">Client Opening Statement</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.clientStatement}</p>
            </div>
          )}

          {/* Operations Message */}
          {parsed.operations && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-1.5">Operations Note</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.operations}</p>
            </div>
          )}

          {/* Attachments */}
          {parsed.attachments && parsed.attachments.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {parsed.attachments.map((att, idx) => {
                  const targetUrl = att.url.startsWith('/') ? `${window.location.origin}${att.url}` : att.url;
                  return (
                    <a key={idx} href={targetUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-slate-600 hover:text-purple-700 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      View Attachment {parsed.attachments.length > 1 ? idx + 1 : ''}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Private Notes Section */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <EyeOff className="h-3.5 w-3.5 text-purple-600" />
              <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest">Private Notes</p>
            </div>
            {privateUnlocked ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{privateValue || <span className="italic text-gray-400">No private notes added.</span>}</p>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <Lock className="h-6 w-6 text-purple-600" />
                <p className="text-xs text-gray-500 text-center max-w-sm">
                  {privateValue ? "These private notes are locked. Unlock to view." : "No private notes added."}
                </p>
                {privateValue && hasPassword && (
                  <button type="button" onClick={() => setShowPrompt(true)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#025545] text-white text-xs font-semibold hover:bg-[#012f23] transition-colors">
                    <Unlock className="h-3.5 w-3.5" /> Unlock
                  </button>
                )}
                {privateValue && hasPassword === false && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    Set your private-notes password first from the sessions page header.
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>

      {/* Password Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6">
            <form onSubmit={handleUnlockSubmit} className="space-y-3">
              <p className="text-sm font-semibold text-gray-900 mb-4">Unlock Private Notes</p>
              <div className="relative">
                <input
                  type={showPlain ? "text" : "password"}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#025545] focus:ring-1 focus:ring-[#025545]"
                />
                <button type="button" onClick={() => setShowPlain((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPlain ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {unlockError && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{unlockError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowPrompt(false); setPassword(""); setUnlockError(""); }} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#025545] hover:bg-[#012f23] rounded-lg disabled:opacity-50">
                  {submitting ? "..." : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
