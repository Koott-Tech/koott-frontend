'use client';
import AssessmentFlow from '@/components/AssessmentFlow';
import { DASS_ITEMS, DASS_SCALE } from '@/lib/assessmentQuestions';
import { CONSENT_TITLE, CONSENT_SUBTITLE, CONSENT_SECTIONS, CONSENT_NOTE } from '@/lib/dassConsent';

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export default function Dass21Page() {
  return (
    <AssessmentFlow
      title="Depression Anxiety Stress Scales (DASS-21)"
      consent={{ title: CONSENT_TITLE, subtitle: CONSENT_SUBTITLE, sections: CONSENT_SECTIONS, note: CONSENT_NOTE }}
      intro={[
        <>The DASS-21 is a short questionnaire of <b>21 statements</b> about how you have been feeling <b>over the past week</b>. It takes about five minutes. It gives separate scores for depression, anxiety and stress.</>,
        <>It is a screening measure, not a diagnosis, and there are no right or wrong answers. Your psychologist will go through the results with you.</>,
      ]}
      questionLead="Over the past week…"
      questions={DASS_ITEMS.map((it) => ({ key: String(it.n), text: it.text }))}
      input={{ type: 'radio', options: DASS_SCALE.map((label, v) => ({ value: v, label })) }}
      endpoint={`${API}/assessment-reports/dass-21`}
      buildPayload={({ answers, details, email }) => ({
        ...details, email, answers,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        // anonymisedUse is deliberately omitted: the single-checkbox intro does not ask
        // the consent form's elective research-use question, so the backend records 'decline'.
        consent: { agreed: true, agreedAt: new Date().toISOString() },
      })}
      doneMessage="The DASS-21 is a screening measure, not a diagnosis — your psychologist will go through the results with you."
    />
  );
}
