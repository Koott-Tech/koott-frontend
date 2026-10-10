'use client';
import { useState } from 'react';
import AssessmentShell from '@/components/assessments/AssessmentShell';
import LikertGroup from '@/components/assessments/LikertGroup';
import { DASS_ITEMS, DASS_SCALE } from '@/lib/assessmentQuestions';

export default function Dass21Page() {
  const [value, setValue] = useState({});
  const set = (n, v) => setValue((p) => ({ ...p, [n]: v }));
  const answered = Object.keys(value).length;

  return (
    <AssessmentShell
      title="Depression Anxiety Stress Scales"
      subtitle="DASS-21"
      intro="Please read each statement and choose the number 0, 1, 2 or 3 which indicates how much the statement applied to you over the past week. There are no right or wrong answers. Do not spend too much time on any statement."
      endpoint="dass-21"
      buildBody={() => ({ answers: value })}
    >
      <p className="text-sm font-medium text-[#0B5345]">
        Over the past week… <span className="text-slate-400 font-normal">({answered}/21 answered)</span>
      </p>
      <LikertGroup items={DASS_ITEMS} scale={DASS_SCALE} min={0} value={value} onChange={set} prompt="Statement" />
    </AssessmentShell>
  );
}
