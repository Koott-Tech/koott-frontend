'use client';
import { useState } from 'react';
import AssessmentFlow from '@/components/AssessmentFlow';
import { KR_DOMAINS } from '@/lib/assessmentQuestions';
import { CONSENT_TITLE, CONSENT_SUBTITLE, CONSENT_SECTIONS, CONSENT_NOTE } from '@/lib/kalyanaConsent';

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(/\/$/, '');

// The 10 domains flattened to one list, keyed "domain.question" so the answers
// can be folded back into the [domain][question] shape the backend expects.
const QUESTIONS = KR_DOMAINS.flatMap((dm, di) =>
  dm.questions.map((text, qi) => ({ key: `${di}.${qi}`, text, group: dm.title })));

export default function KalyanaRamanPage() {
  const [partner, setPartner] = useState('A');

  return (
    <AssessmentFlow
      title="Kalyana Raman: Pre-Marital Readiness Assessment"
      consent={{ title: CONSENT_TITLE, subtitle: CONSENT_SUBTITLE, sections: CONSENT_SECTIONS, note: CONSENT_NOTE }}
      intro={[
        <>This assessment has <b>30 open questions</b> across <b>10 areas</b> of married life — expectations, communication, money, intimacy, family, children and more. It usually takes 30–45 minutes.</>,
        <>Please answer <b>on your own, without discussing your answers with your partner beforehand</b>. Write as much or as little as you like — there are no right or wrong answers. Your answers are not shared with your partner without your consent.</>,
      ]}
      introExtra={() => (
        /* Each partner completes their own copy; this labels whose responses these are. */
        <div>
          <span className="block text-[12px] font-medium text-slate-600 mb-1.5">I am completing this as</span>
          <div className="flex gap-2">
            {['A', 'B'].map((p) => (
              <button key={p} type="button" onClick={() => setPartner(p)} aria-pressed={partner === p}
                className={`px-5 min-h-11 rounded-lg border text-sm font-medium ${
                  partner === p ? 'bg-[#0B5345] text-white border-[#0B5345]' : 'bg-white text-slate-600 border-slate-300'}`}>
                Partner {p}
              </button>
            ))}
          </div>
        </div>
      )}
      questions={QUESTIONS}
      input={{ type: 'textarea', placeholder: 'Your answer…' }}
      endpoint={`${API}/assessment-reports/kalyana-raman`}
      buildPayload={({ answers, details, email }) => ({
        ...details, email, partner,
        answers: KR_DOMAINS.map((dm, di) => dm.questions.map((_, qi) => answers[`${di}.${qi}`] || '')),
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        consent: { agreed: true, agreedAt: new Date().toISOString() },
      })}
      doneMessage="A qualified psychologist will review your responses, meet you for an individual interview, and discuss them with you. Your answers are not shared with your partner without your consent."
    />
  );
}
