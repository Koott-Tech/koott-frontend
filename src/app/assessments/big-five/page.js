'use client';
import { useState } from 'react';
import AssessmentShell from '@/components/assessments/AssessmentShell';
import LikertGroup from '@/components/assessments/LikertGroup';
import { BFI_ITEMS, BFI_SCALE } from '@/lib/assessmentQuestions';

export default function BigFivePage() {
  const [value, setValue] = useState({});
  const set = (n, v) => setValue((p) => ({ ...p, [n]: v }));
  const answered = Object.keys(value).length;

  return (
    <AssessmentShell
      title="Big Five Personality Inventory"
      subtitle="BFI-44"
      intro="Here are a number of characteristics that may or may not apply to you. For each statement, choose the number that shows how much you agree or disagree that it describes you."
      endpoint="big-five"
      buildBody={() => ({ answers: value })}
    >
      <p className="text-sm font-medium text-[#0B5345]">
        I see myself as someone who… <span className="text-slate-400 font-normal">({answered}/44 answered)</span>
      </p>
      <LikertGroup items={BFI_ITEMS} scale={BFI_SCALE} min={1} value={value} onChange={set} prompt="Statement" />
    </AssessmentShell>
  );
}
