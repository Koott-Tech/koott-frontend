'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * The shared assessment flow used by DASS-21, Big Five and Kalyana Raman.
 *
 *   intro (consent + email) -> one question per screen -> review -> details -> done
 *
 * Keeping all three on this one component is deliberate: the flow was specified
 * once and must not drift between the three assessments.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Field = ({ label, required, ...props }) => (
  <label className="block">
    <span className="block text-[12px] font-medium text-slate-600 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</span>
    <input {...props}
      className="w-full border border-slate-300 rounded-lg px-3 min-h-11 py-2 text-sm focus:border-[#0B5345] focus:outline-none" />
  </label>
);

/** The whole consent form, shown over the page so the intro step stays short. */
function ConsentModal({ consent, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={consent.title}
           className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-xl shadow-xl outline-none">
        <div className="flex items-start justify-between gap-4 px-5 sm:px-7 py-4 border-b border-slate-100">
          <div>
            <div role="heading" aria-level={2} className="text-[#0B5345] font-semibold text-sm" style={{ lineHeight: 1.4 }}>{consent.title}</div>
            <p className="text-xs text-slate-500 mt-0.5">{consent.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
          {consent.sections.map((s) => (
            <section key={s.n}>
              <div role="heading" aria-level={3} className="text-[#0B5345] font-semibold text-sm mb-1.5" style={{ lineHeight: 1.4 }}>{s.n}. {s.heading}</div>
              {s.paragraphs?.map((p, i) => <p key={i} className="text-[13px] text-slate-600 leading-relaxed mb-1.5">{p}</p>)}
              {s.bullets && (
                <ul className="list-disc pl-5 space-y-0.5">
                  {s.bullets.map((b, i) => <li key={i} className="text-[13px] text-slate-600 leading-relaxed">{b}</li>)}
                </ul>
              )}
              {s.choice && (
                <>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1.5">
                    {s.choice.options.map((o) => <li key={o.value} className="text-[13px] text-slate-600 leading-relaxed">{o.label}</li>)}
                  </ul>
                  {/* The single intro checkbox cannot carry this elective choice, so say what we record. */}
                  <p className="text-[12px] text-slate-500 leading-relaxed mt-2 italic">
                    This one is your choice and is not part of agreeing to the assessment. We
                    record it as “I do not agree to this use” unless you tell your psychologist
                    otherwise.
                  </p>
                </>
              )}
              {s.declaration && <p className="text-[13px] text-slate-800 font-medium leading-relaxed mt-1.5">{s.declaration}</p>}
            </section>
          ))}
          {consent.note && (
            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
              <span className="font-semibold text-slate-500">Note:</span> {consent.note}
            </p>
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="w-full bg-[#0B5345] text-white rounded-lg min-h-11 py-2.5 text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentFlow({
  title,            // page + header title
  consent,          // { title, subtitle, sections, note }
  intro,            // array of paragraphs (JSX allowed)
  questions,        // [{ key, text, group }]  group is the optional category title
  input,            // { type:'radio', options:[{value,label}] } | { type:'textarea', placeholder, prompt }
  questionLead,     // small grey line above each question, e.g. 'Over the past week…'
  introExtra,       // optional ({ disabled }) => JSX rendered on the intro step
  endpoint,         // POST url
  buildPayload,     // ({ answers, details, email }) => body object
  doneMessage,      // JSX shown on the done screen
}) {
  const TOTAL = questions.length;
  const isText = input.type === 'textarea';

  const [step, setStep] = useState('intro');
  const [showConsent, setShowConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState({});
  const [i, setI] = useState(0);
  const [details, setDetails] = useState({ name: '', phone: '', dob: '', sex: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const filled = (v) => (isText ? typeof v === 'string' && v.trim() !== '' : v !== undefined && v !== null);
  const answered = questions.filter((q) => filled(answers[q.key])).length;
  const q = questions[i];
  const current = filled(answers[q?.key]);   // is the question on screen answered yet
  const top = () => window.scrollTo({ top: 0 });

  // Where this question sits inside its category, for the eyebrow label.
  const groups = [...new Set(questions.map((x) => x.group).filter(Boolean))];
  const groupIdx = q?.group ? groups.indexOf(q.group) + 1 : 0;

  const start = (e) => {
    e.preventDefault();
    if (!agreed) return setError('Please tick the box to confirm you have read the informed consent.');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address so your psychologist can reach you about this assessment.');
    setError(''); setStep('questions'); setI(0); top();
  };

  const choose = (v) => {
    setAnswers((p) => ({ ...p, [q.key]: v }));
    // Radio answers advance on their own; typed answers must not, or you lose the cursor.
    if (!isText && i < TOTAL - 1) setTimeout(() => setI((n) => n + 1), 140);
  };

  const goSubmit = () => {
    const missing = questions.filter((x) => !filled(answers[x.key]));
    if (missing.length) {
      setError(`Please answer every question — ${missing.length} still to go.`);
      setI(questions.indexOf(missing[0]));
      setStep('questions'); top();
      return;
    }
    setError(''); setStep('details'); top();
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!details.name.trim()) return setError('Please enter your name.');
    setError(''); setSending(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({ answers, details, email })),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Submission failed');
      setStep('done'); top();
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  /* ---------- done ---------- */
  if (step === 'done') return (
    <main className="min-h-screen bg-[#EFF6F0] flex items-center justify-center px-4 pt-24 pb-10">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-sm p-7 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#0B5345]/10 mx-auto mb-5 flex items-center justify-center text-[#0B5345] text-2xl">✓</div>
        <div role="heading" aria-level={1} className="text-lg font-semibold text-[#0B5345] mb-2" style={{ lineHeight: 1.35 }}>Your report is on its way</div>
        <p className="text-slate-600 text-sm leading-relaxed">
          Your responses have gone to your psychologist. {doneMessage}
        </p>
      </div>
    </main>
  );

  const stepLabel = step === 'intro' ? 'Before you begin'
    : step === 'questions' ? `Question ${i + 1} of ${TOTAL}`
    : step === 'review' ? 'Review your answers'
    : 'Almost done';

  return (
    <main className="min-h-screen bg-[#EFF6F0] pt-24 pb-10 px-3 sm:px-4">
      {showConsent && <ConsentModal consent={consent} onClose={() => setShowConsent(false)} />}

      <form onSubmit={step === 'intro' ? start : step === 'details' ? generate : (e) => e.preventDefault()}
            className="max-w-2xl mx-auto">

        <div className="bg-[#0B5345] text-white rounded-t-xl px-5 sm:px-8 py-4 sm:py-5">
          <div role="heading" aria-level={1} className="text-base sm:text-lg font-semibold" style={{ lineHeight: 1.35 }}>{title}</div>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5">{stepLabel}</p>
        </div>

        {/* ───────── 1. INTRO + CONSENT + EMAIL ───────── */}
        {step === 'intro' && (
          <div className="bg-white px-5 sm:px-8 py-6 space-y-5">
            {intro.map((p, n) => <p key={n} className="text-[13.5px] text-slate-600 leading-relaxed">{p}</p>)}

            {introExtra?.()}

            <label className={`flex gap-3 items-start p-3.5 rounded-lg border cursor-pointer ${agreed ? 'border-[#0B5345] bg-[#0B5345]/5' : 'border-slate-300'}`}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#0B5345] shrink-0" />
              <span className="text-[13px] text-slate-800 leading-relaxed">
                I have read and agree to the{' '}
                <button type="button" onClick={(e) => { e.preventDefault(); setShowConsent(true); }}
                  className="text-[#0B5345] font-semibold underline underline-offset-2">Informed Consent</button>.
              </span>
            </label>

            <Field label="Email ID" required type="email" value={email} inputMode="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {/* The report is NOT mailed to the client; do not promise them a copy. */}
            <p className="text-[11px] text-slate-400 -mt-2">So your psychologist can reach you about this assessment.</p>
          </div>
        )}

        {/* ───────── 2. ONE QUESTION AT A TIME ───────── */}
        {step === 'questions' && (
          <div className="bg-white px-5 sm:px-8 py-7">
            {/* Sits inside the card, not under the header - a dark bar on the dark
                green header was invisible. */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#3DA58A] transition-all"
                     style={{ width: `${(answered / TOTAL) * 100}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{answered}/{TOTAL}</span>
            </div>

            {q.group
              ? <p className="text-[12px] text-[#0B5345] font-semibold mb-2">{groupIdx} of {groups.length} · {q.group}</p>
              : questionLead && <p className="text-[12px] text-slate-400 mb-2">{questionLead}</p>}

            <div role="heading" aria-level={2} className="text-[15px] sm:text-base text-slate-800 font-medium mb-5" style={{ lineHeight: 1.5 }}>
              {q.text}
            </div>

            {isText ? (
              <textarea value={answers[q.key] ?? ''} onChange={(e) => choose(e.target.value)}
                rows={7} placeholder={input.placeholder}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-y focus:border-[#0B5345] focus:outline-none" />
            ) : (
              <div role="radiogroup" aria-label={q.text} className="space-y-2.5">
                {input.options.map((o) => {
                  const picked = answers[q.key] === o.value;
                  return (
                    <label key={o.value}
                      className={`flex gap-3 items-start p-3.5 rounded-lg border cursor-pointer transition ${
                        picked ? 'border-[#0B5345] bg-[#0B5345]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name={`q${q.key}`} checked={picked} onChange={() => choose(o.value)}
                        className="mt-0.5 w-4 h-4 accent-[#0B5345] shrink-0" />
                      <span className="text-[13.5px] text-slate-700 leading-relaxed">
                        <span className="font-semibold text-[#0B5345] mr-1.5">{o.value}</span>{o.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Going forward needs an answer; going back never does, so any
                earlier answer can still be revisited and changed. */}
            <div className="flex items-center justify-between gap-3 mt-6">
              <button type="button" disabled={i === 0}
                onClick={() => { setError(''); setI((n) => Math.max(0, n - 1)); }}
                className="px-5 min-h-11 rounded-lg border border-slate-300 text-slate-600 text-sm disabled:opacity-40">Previous</button>
              <span className="text-xs text-slate-400 text-center">
                {current ? `${answered} of ${TOTAL} answered` : 'Answer to continue'}
              </span>
              {i < TOTAL - 1 ? (
                <button type="button" disabled={!current}
                  onClick={() => { setError(''); setI((n) => Math.min(TOTAL - 1, n + 1)); }}
                  className="px-5 min-h-11 rounded-lg border border-slate-300 text-slate-600 text-sm disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              ) : <span className="w-[76px]" />}
            </div>

            {/* 3. The two end-of-assessment actions. They also appear once everything
                is answered, so editing an earlier answer does not mean clicking
                Next all the way back to the end. */}
            {(i === TOTAL - 1 || answered === TOTAL) && (
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => { setError(''); setStep('review'); top(); }}
                  className="flex-1 min-h-11 rounded-lg border border-[#0B5345] text-[#0B5345] text-sm font-medium">Review my answers</button>
                <button type="button" onClick={goSubmit}
                  className="flex-1 min-h-11 rounded-lg bg-[#0B5345] text-white text-sm font-medium">Submit</button>
              </div>
            )}
          </div>
        )}

        {/* ───────── 3. REVIEW ───────── */}
        {step === 'review' && (
          <div className="bg-white px-5 sm:px-8 py-6">
            <p className="text-[13px] text-slate-600 leading-relaxed mb-4">Tap any question to change your answer.</p>
            <ul className="divide-y divide-slate-100">
              {questions.map((x, idx) => {
                const v = answers[x.key];
                const done = filled(v);
                const shown = !done ? 'Not answered'
                  : isText ? (String(v).length > 70 ? `${String(v).slice(0, 70)}…` : String(v))
                  : `${v} · ${input.options.find((o) => o.value === v)?.label}`;
                return (
                  <li key={x.key}>
                    <button type="button" onClick={() => { setI(idx); setStep('questions'); top(); }}
                      className={`w-full text-left py-3 flex gap-3 items-start hover:bg-slate-50 rounded-lg px-2 -mx-2 ${isText ? 'flex-col sm:flex-row' : ''}`}>
                      <span className="text-[11px] text-slate-400 w-5 shrink-0 pt-0.5">{idx + 1}</span>
                      <span className="flex-1 text-[13px] text-slate-700 leading-relaxed">{x.text}</span>
                      <span className={`text-[12px] shrink-0 font-medium ${done ? 'text-[#0B5345]' : 'text-rose-500'} ${isText ? 'sm:max-w-[45%] sm:text-right' : ''}`}>{shown}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={goSubmit}
              className="w-full mt-6 min-h-11 rounded-lg bg-[#0B5345] text-white text-sm font-medium">Submit</button>
          </div>
        )}

        {/* ───────── 4. DETAILS ───────── */}
        {step === 'details' && (
          <div className="bg-white px-5 sm:px-8 py-6">
            <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
              Thank you. Please add your details so the report can be identified correctly.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name" required value={details.name} onChange={(e) => setDetails((p) => ({ ...p, name: e.target.value }))} />
              <Field label="Mobile number" value={details.phone} inputMode="tel" onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))} />
              <Field label="Date of birth" type="date" value={details.dob} onChange={(e) => setDetails((p) => ({ ...p, dob: e.target.value }))} />
              <label className="block">
                <span className="block text-[12px] font-medium text-slate-600 mb-1">Sex</span>
                <select value={details.sex} onChange={(e) => setDetails((p) => ({ ...p, sex: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 min-h-11 py-2 text-sm bg-white focus:border-[#0B5345] focus:outline-none">
                  <option value="">Select</option>
                  <option>Female</option><option>Male</option>
                  <option>Other</option><option>Prefer not to say</option>
                </select>
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-4">Your psychologist will go through the results with you in your session.</p>
          </div>
        )}

        <div className="bg-white rounded-b-xl px-5 sm:px-8 py-6 border-t border-slate-100">
          {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}
          {step === 'intro' && (
            <button type="submit" className="w-full bg-[#0B5345] text-white rounded-lg min-h-11 py-3 font-medium">Start assessment</button>
          )}
          {step === 'details' && (
            <div className="flex gap-3">
              <button type="button" onClick={() => { setError(''); setStep('review'); top(); }}
                className="px-5 min-h-11 rounded-lg border border-slate-300 text-slate-600 text-sm">Back</button>
              <button type="submit" disabled={sending}
                className="flex-1 bg-[#0B5345] text-white rounded-lg min-h-11 py-3 font-medium disabled:opacity-60">
                {sending ? 'Generating…' : 'Generate report'}
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Your responses are used to produce a report for you and your psychologist.
          </p>
        </div>
      </form>
    </main>
  );
}
