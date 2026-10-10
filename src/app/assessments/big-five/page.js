'use client';
import { useState } from 'react';
import { BFI_ITEMS, BFI_SCALE } from '@/lib/assessmentQuestions';
import { CONSENT_TITLE, CONSENT_SUBTITLE, CONSENT_SECTIONS, CONSENT_NOTE } from '@/lib/big5Consent';

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(/\/$/, '');
// toISOString() is UTC, so it reports yesterday for anyone in India submitting before 05:30
// IST. en-CA gives the YYYY-MM-DD that <input type="date"> needs, in the Asia/Kolkata day.
const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const Field = ({ label, required, ...props }) => (
  <label className="block text-sm">
    <span className="block text-slate-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</span>
    <input {...props}
      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B5345]/30" />
  </label>
);

export default function BigFivePage() {
  const [step, setStep] = useState('consent');          // consent -> details -> questions -> done
  const [d, setD] = useState({ name: '', dob: '', address: '', email: '', phone: '', date: todayIso() });
  const [anonymisedUse, setAnonymisedUse] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));
  const answered = Object.keys(answers).length;

  const continueFromConsent = (e) => {
    e.preventDefault();
    if (!anonymisedUse) return setError('Please choose one of the two options in section 6.');
    if (!agreed) return setError('Please tick the declaration in section 8 to continue.');
    setError(''); setStep('details'); window.scrollTo({ top: 0 });
  };

  const continueFromDetails = (e) => {
    e.preventDefault();
    if (!d.name.trim()) return setError('Please enter your name.');
    setError(''); setStep('questions'); window.scrollTo({ top: 0 });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (answered < BFI_ITEMS.length) return setError(`Please answer all ${BFI_ITEMS.length} statements. ${answered} answered so far.`);
    setError(''); setSending(true);
    try {
      const res = await fetch(`${API}/assessment-reports/big-five`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, answers, consent: { agreed: true, anonymisedUse, agreedAt: new Date().toISOString() } }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Submission failed');
      setStep('done'); window.scrollTo({ top: 0 });
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  /* ---------- done ---------- */
  if (step === 'done') return (
    <main className="min-h-screen bg-[#EFF6F0] flex items-center justify-center px-4 pt-24 pb-10">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-sm p-7 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#0B5345]/10 mx-auto mb-5 flex items-center justify-center text-[#0B5345] text-2xl">✓</div>
        <div role="heading" aria-level={1} className="text-lg font-semibold text-[#0B5345] mb-2" style={{ lineHeight: 1.35 }}>Thank you</div>
        <p className="text-slate-600 text-sm leading-relaxed">
          Your responses have been submitted. A qualified psychologist will score and review them,
          and discuss the results with you in a feedback session.
        </p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#EFF6F0] pt-24 pb-10 px-3 sm:px-4">
      <form onSubmit={step === 'consent' ? continueFromConsent : step === 'details' ? continueFromDetails : submit}
            className="max-w-3xl mx-auto">

        <div className="bg-[#0B5345] text-white rounded-t-xl px-5 sm:px-8 py-4 sm:py-5">
          <div role="heading" aria-level={1} className="text-base sm:text-lg font-semibold" style={{ lineHeight: 1.35 }}>
            {step === 'consent' ? CONSENT_TITLE
              : step === 'details' ? 'Your details'
              : 'Big Five Personality Inventory (BFI-44)'}
          </div>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5">
            {step === 'consent' ? `${CONSENT_SUBTITLE} · Step 1 of 3`
              : step === 'details' ? 'Step 2 of 3'
              : `Step 3 of 3 · ${BFI_ITEMS.length} statements`}
          </p>
        </div>

        {/* ───────── STEP 1: CONSENT ───────── */}
        {step === 'consent' && (
          <div className="bg-white px-5 sm:px-8 py-6 space-y-6">
            <div className="space-y-5">
              {CONSENT_SECTIONS.map((s) => (
                <section key={s.n}>
                  <div role="heading" aria-level={2} className="text-[#0B5345] font-semibold text-sm mb-1.5" style={{ lineHeight: 1.4 }}>{s.n}. {s.heading}</div>
                  {s.paragraphs?.map((p, i) => (
                    <p key={i} className="text-[13px] text-slate-600 leading-relaxed mb-1.5">{p}</p>
                  ))}
                  {s.bullets && (
                    <ul className="list-disc pl-5 space-y-0.5">
                      {s.bullets.map((b, i) => <li key={i} className="text-[13px] text-slate-600 leading-relaxed">{b}</li>)}
                    </ul>
                  )}
                  {s.choice && (
                    <div className="mt-3 space-y-2">
                      {s.choice.options.map((o) => (
                        <label key={o.value}
                          className={`flex gap-3 items-start p-3 rounded-lg border cursor-pointer text-[13px] leading-relaxed ${
                            anonymisedUse === o.value ? 'border-[#0B5345] bg-[#0B5345]/5' : 'border-slate-200'}`}>
                          <input type="radio" name={s.choice.name} value={o.value}
                            checked={anonymisedUse === o.value} onChange={() => setAnonymisedUse(o.value)}
                            className="mt-0.5 w-4 h-4 accent-[#0B5345] shrink-0" />
                          <span className="text-slate-700">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {s.declaration && (
                    <label className={`mt-3 flex gap-3 items-start p-3.5 rounded-lg border cursor-pointer ${
                      agreed ? 'border-[#0B5345] bg-[#0B5345]/5' : 'border-slate-300'}`}>
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#0B5345] shrink-0" />
                      <span className="text-[13px] text-slate-800 font-medium leading-relaxed">{s.declaration}</span>
                    </label>
                  )}
                </section>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
              <span className="font-semibold text-slate-500">Note:</span> {CONSENT_NOTE}
            </p>
          </div>
        )}

        {/* ───────── STEP 2: DETAILS ───────── */}
        {step === 'details' && (
          <div className="bg-white px-5 sm:px-8 py-6">
            <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
              Thank you for consenting. Please fill in your details below so your report can be
              identified correctly.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name" required value={d.name} onChange={set('name')} />
              <Field label="Date of birth" type="date" value={d.dob} onChange={set('dob')} />
              <Field label="Email ID" type="email" value={d.email} onChange={set('email')} />
              <Field label="Phone number" value={d.phone} onChange={set('phone')} />
              <div className="sm:col-span-2"><Field label="Address" value={d.address} onChange={set('address')} /></div>
              <Field label="Date" type="date" value={d.date} onChange={set('date')} />
            </div>
          </div>
        )}

        {/* ───────── STEP 3: QUESTIONNAIRE ───────── */}
        {step === 'questions' && (
          <div className="bg-white px-5 sm:px-8 py-6 space-y-5">
            {/* Rating scale, kept in view while answering. */}
            <div className="sticky top-16 bg-white pt-1 pb-3 z-10 border-b border-slate-100">
              <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
                Here are a number of characteristics that may or may not apply to you. For each statement, choose the
                number <b>1</b> to <b>5</b> that shows how much you agree or disagree that it describes you.
                There are no right or wrong answers.
              </p>
              <p className="text-[13px] font-medium text-[#0B5345] mb-2">I see myself as someone who…</p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 bg-slate-50 rounded-lg px-3 py-2.5">
                {BFI_SCALE.map((s, i) => (
                  <li key={i} className="text-[11.5px] text-slate-600 leading-snug">
                    <span className="inline-block w-5 font-semibold text-[#0B5345]">{i + 1}</span>{s}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-2">{answered}/{BFI_ITEMS.length} answered</p>
            </div>

            {BFI_ITEMS.map((item) => {
              const picked = answers[item.n];
              return (
                <div key={item.n} className={`py-3 border-b border-slate-100 ${picked === undefined ? 'bg-amber-50/40' : ''}`}>
                  <p className="text-sm text-slate-700 mb-2.5">
                    <span className="text-slate-400 mr-1.5">{item.n}.</span>{item.text}
                  </p>
                  <div className="flex gap-2">
                    {BFI_SCALE.map((_, i) => { const v = i + 1; return (
                      <button key={v} type="button" onClick={() => setAnswers((p) => ({ ...p, [item.n]: v }))}
                        aria-pressed={picked === v} aria-label={`${item.text}: ${v}`}
                        className={`flex-1 h-11 rounded-lg border text-sm font-medium transition ${
                          picked === v ? 'bg-[#0B5345] text-white border-[#0B5345]' : 'bg-white text-slate-500 border-slate-300'}`}>
                        {v}
                      </button>
                    ); })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-b-xl px-5 sm:px-8 py-6 border-t border-slate-100">
          {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-3">
            {step !== 'consent' && (
              <button type="button"
                onClick={() => { setError(''); setStep(step === 'questions' ? 'details' : 'consent'); window.scrollTo({ top: 0 }); }}
                className="px-5 min-h-11 rounded-lg border border-slate-300 text-slate-600 text-sm">Back</button>
            )}
            <button type="submit" disabled={sending}
              className="flex-1 bg-[#0B5345] text-white rounded-lg min-h-11 py-3 font-medium disabled:opacity-60">
              {step === 'consent' ? 'I agree — continue'
                : step === 'details' ? 'Continue to the questionnaire'
                : sending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Your responses are used to produce a report for your psychologist.
          </p>
        </div>
      </form>
    </main>
  );
}
