'use client';
import AssessmentFlow from '@/components/AssessmentFlow';
import { BFI_ITEMS, BFI_SCALE } from '@/lib/assessmentQuestions';
import { CONSENT_TITLE, CONSENT_SUBTITLE, CONSENT_SECTIONS, CONSENT_NOTE } from '@/lib/big5Consent';

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export default function BigFivePage() {
  return (
    <AssessmentFlow
      title="Big Five Personality Inventory (BFI-44)"
      consent={{ title: CONSENT_TITLE, subtitle: CONSENT_SUBTITLE, sections: CONSENT_SECTIONS, note: CONSENT_NOTE }}
      intro={[
        <>The BFI-44 is a questionnaire of <b>44 short statements</b> about how you usually are. It takes about ten minutes and gives scores on five personality traits: extraversion, agreeableness, conscientiousness, neuroticism and openness.</>,
        <>There are no right or wrong answers and no good or bad results — it describes style, not ability. Your psychologist will go through the results with you.</>,
      ]}
      questionLead="I see myself as someone who…"
      questions={BFI_ITEMS.map((it) => ({ key: String(it.n), text: it.text }))}
      // BFI is scored 1-5, unlike the DASS which starts at 0.
      input={{ type: 'radio', options: BFI_SCALE.map((label, idx) => ({ value: idx + 1, label })) }}
      endpoint={`${API}/assessment-reports/big-five`}
      buildPayload={({ answers, details, email }) => ({
        ...details, email, answers,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        consent: { agreed: true, agreedAt: new Date().toISOString() },
      })}
      doneMessage="The BFI-44 describes personality style rather than ability, and no result is good or bad — your psychologist will go through it with you."
    />
  );
}
