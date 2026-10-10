'use client';
import { useState } from 'react';

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(/\/$/, '');

/**
 * Shared chrome for the three assessment questionnaires: the heading, the participant
 * fields, submit handling and the success/error states. Each assessment supplies its own
 * question rendering as children and a builder that turns local state into the request body.
 */
export default function AssessmentShell({ title, subtitle, intro, endpoint, buildBody, children, extraFields = null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState(null);   // null | 'sending' | 'done'
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setStatus('sending');
    try {
      const res = await fetch(`${API}/assessment-reports/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, ...buildBody() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Submission failed');
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus(null);
    }
  };

  if (status === 'done') {
    return (
      <main className="min-h-screen bg-[#EFF6F0] flex items-center justify-center px-4 pt-24 pb-10">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm p-7 sm:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0B5345]/10 mx-auto mb-5 flex items-center justify-center">
            <span className="text-[#0B5345] text-2xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold text-[#0B5345] mb-2">Thank you</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your responses have been submitted and the report has been sent to the practice.
            Your therapist will go through the results with you.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EFF6F0] pt-24 pb-10 px-3 sm:px-4">
      <form onSubmit={submit} className="max-w-3xl mx-auto">
        <div className="bg-[#0B5345] text-white rounded-t-xl px-5 sm:px-8 py-5 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-semibold leading-[1.25] pb-0.5">{title}</h1>
          {subtitle && <p className="text-white/70 text-sm mt-1">{subtitle}</p>}
        </div>

        <div className="bg-white px-5 sm:px-8 py-6 sm:py-7 space-y-6">
          {intro && <p className="text-sm text-slate-600 leading-relaxed">{intro}</p>}

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="text-sm">
              <span className="block text-slate-700 mb-1">Name <span className="text-rose-500">*</span></span>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B5345]/30" />
            </label>
            <label className="text-sm">
              <span className="block text-slate-700 mb-1">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B5345]/30" />
            </label>
            <label className="text-sm">
              <span className="block text-slate-700 mb-1">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B5345]/30" />
            </label>
          </div>
          {extraFields}
        </div>

        <div className="bg-white px-5 sm:px-8 pb-8 border-t border-slate-100 pt-6 space-y-5">{children}</div>

        <div className="bg-white rounded-b-xl px-5 sm:px-8 py-6 border-t border-slate-100">
          {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}
          <button type="submit" disabled={status === 'sending'}
            className="w-full bg-[#0B5345] text-white rounded-lg py-3 font-medium disabled:opacity-60">
            {status === 'sending' ? 'Submitting…' : 'Submit'}
          </button>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Your responses are used to produce a report for your therapist. They are not stored on this website.
          </p>
        </div>
      </form>
    </main>
  );
}
