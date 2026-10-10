/**
 * Informed consent text for the DASS-21, transcribed from the practice's consent PDF.
 *
 * Word spacing has been repaired where the source PDF had run words together
 * ("Iwillcompletethequestionnaire", "isvoluntary", "Myresponses", "Icanaskquestions",
 * "Ihaveread", "arethatsomequestions"). Wording is otherwise unchanged.
 */

export const CONSENT_TITLE = 'Informed Consent for Psychological Assessment';
export const CONSENT_SUBTITLE = 'Depression Anxiety Stress Scales (DASS-21)';

export const CONSENT_SECTIONS = [
  {
    n: 1,
    heading: 'About this assessment',
    paragraphs: [
      'The DASS-21 is a 21-item self-report questionnaire. It asks how much each statement applied to me over the past week, and gives scores for depression, anxiety and stress.',
    ],
    bullets: [
      'It is a screening tool and does not diagnose any condition.',
      'It reflects how I have been feeling recently, and my scores may change over time.',
      'The results should be reviewed with my psychologist, along with my personal circumstances.',
    ],
  },
  {
    n: 2,
    heading: 'What will happen',
    paragraphs: [
      'I will complete the questionnaire. A qualified psychologist will score and review it and discuss the results with me in a feedback session.',
    ],
  },
  {
    n: 3,
    heading: 'Voluntary participation',
    paragraphs: [
      'My participation is voluntary. I may skip any question I am not comfortable answering, take a break, or withdraw at any time without any penalty to the care I receive.',
    ],
  },
  {
    n: 4,
    heading: 'Confidentiality and its limits',
    paragraphs: [
      'My responses and report are confidential and will be shared only with the professional(s) involved in my care. Confidentiality may need to be limited in these situations:',
    ],
    bullets: [
      'There is a serious risk of harm to me or to another person.',
      'There is concern about abuse or neglect of a child or a vulnerable person.',
      'A court or law requires the information to be disclosed.',
    ],
  },
  {
    n: 5,
    heading: 'Emotional distress and safety',
    paragraphs: [
      'Some statements ask about low mood, anxiety, tension and feeling that life is meaningless, and may bring up difficult feelings. If my responses suggest that I am significantly distressed or that I may be at risk, my psychologist may contact me to talk about support, referral or other steps to keep me safe. If I feel distressed while answering, I can stop and tell my psychologist at any time.',
    ],
  },
  {
    n: 6,
    heading: 'Possible risks and benefits',
    paragraphs: [
      'The risks are that some questions may be upsetting. Possible benefits include a clearer picture of how I have been feeling and help in deciding what support may be useful. No outcome is guaranteed.',
    ],
  },
  {
    n: 7,
    heading: 'Records and use of information',
    paragraphs: [
      'My responses and report will be stored securely, kept for the period required by professional and legal standards, and accessed only by people with a legitimate role. My report will be given to me. It will be shared with anyone else (for example another psychologist or professional) only with my written permission, or where the law requires.',
    ],
    // Rendered as a required either/or choice, replacing the paper form's two tick boxes.
    choice: {
      name: 'anonymisedUse',
      options: [
        { value: 'agree', label: 'I agree that my anonymised information (without my name or contact details) may be used for service improvement or research.' },
        { value: 'decline', label: 'I do not agree to this use.' },
      ],
    },
  },
  {
    n: 8,
    heading: 'My rights',
    paragraphs: [
      'I can ask questions about the assessment at any time, ask to see my report, ask for errors to be corrected, and ask how my information is stored and used.',
    ],
  },
  {
    n: 9,
    heading: 'Declaration',
    paragraphs: [
      'I have read this form (or it has been read and explained to me in a language I understand). I have had the chance to ask questions, and I understand the purpose, limits and confidentiality of this assessment. I give my consent to take part voluntarily.',
    ],
    // The paper form ends with a signature line; online this is the agreement tick.
    declaration: 'I have read and understood this form, and I give my consent to take part.',
  },
];

export const CONSENT_NOTE =
  'The DASS-21 is a screening and self-report measure of current emotional distress; it is not a diagnostic tool and cannot alone provide a complete understanding of an individual’s emotional state. You are advised to schedule a session with your therapist to review and interpret the results in the context of your personal experiences, behavioural patterns, and individual circumstances.';
