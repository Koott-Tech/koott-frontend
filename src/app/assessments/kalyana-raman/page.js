'use client';
import { useState } from 'react';
import AssessmentShell from '@/components/assessments/AssessmentShell';
import { KR_DOMAINS } from '@/lib/assessmentQuestions';

export default function KalyanaRamanPage() {
  // answers[domainIndex][questionIndex]
  const [answers, setAnswers] = useState(() => KR_DOMAINS.map((d) => d.questions.map(() => '')));
  const [partner, setPartner] = useState('A');

  const set = (di, qi, v) => setAnswers((prev) => {
    const next = prev.map((row) => [...row]);
    next[di][qi] = v;
    return next;
  });

  const total = KR_DOMAINS.reduce((a, d) => a + d.questions.length, 0);
  const done = answers.flat().filter((a) => a.trim()).length;

  return (
    <AssessmentShell
      title="Kalyana Raman"
      subtitle="Pre-Marital / Relationship Readiness Assessment"
      intro="Please answer each question in your own words. Complete this on your own, without discussing your answers with your partner first - the value of the assessment comes from each person answering independently. There are no right or wrong answers."
      endpoint="kalyana-raman"
      buildBody={() => ({ partner, answers })}
      extraFields={
        <div className="text-sm">
          <span className="block text-slate-700 mb-2">I am completing this as</span>
          <div className="flex gap-3 flex-wrap">
            {['A', 'B'].map((p) => (
              <button key={p} type="button" onClick={() => setPartner(p)}
                className={`px-5 min-h-11 rounded-lg border text-sm transition ${
                  partner === p ? 'bg-[#0B5345] text-white border-[#0B5345]' : 'bg-white text-slate-600 border-slate-300'}`}>
                Partner {p}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <p className="text-sm font-medium text-[#0B5345]">
        10 sections <span className="text-slate-400 font-normal">({done}/{total} answered)</span>
      </p>

      {KR_DOMAINS.map((domain, di) => (
        <div key={di} className="pt-2">
          <div role="heading" aria-level={2} className="text-[#0B5345] font-medium text-sm mb-3 pb-2 border-b border-slate-100" style={{ lineHeight: 1.4 }}>
            {di + 1}. {domain.title}
          </div>
          <div className="space-y-4">
            {domain.questions.map((q, qi) => (
              <label key={qi} className="block">
                <span className="block text-sm text-slate-700 mb-1.5">
                  <span className="text-slate-400 mr-1.5">Q{di + 1}.{qi + 1}</span>{q}
                </span>
                <textarea rows={3} value={answers[di][qi]} onChange={(e) => set(di, qi, e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#0B5345]/30 ${
                    answers[di][qi].trim() ? 'border-slate-300' : 'border-amber-300 bg-amber-50/40'}`} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </AssessmentShell>
  );
}
