/**
 * Informed consent text for the Big Five Inventory (BFI-44), transcribed from the practice's
 * consent PDF.
 *
 * Word spacing has been repaired where the source PDF had run words together
 * ("The BigFive Inventory", "Iwillrateeachstatement", "isvoluntary", "Myresponses",
 * "The risksaresmall", "I mayfindsomestatements", "storedsecurely", "Icanaskquestions",
 * "Ihaveread"). Wording is otherwise unchanged.
 */

export const CONSENT_TITLE = 'Informed Consent for Psychological Assessment';
export const CONSENT_SUBTITLE = 'Big Five Inventory (BFI-44)';

export const CONSENT_SECTIONS = [
  {
    n: 1,
    heading: 'About this assessment',
    paragraphs: [
      'The Big Five Inventory (BFI-44) is a 44-item self-report questionnaire. It describes five broad personality traits: Extraversion, Agreeableness, Conscientiousness, Neuroticism and Openness. There are no right or wrong answers.',
    ],
    bullets: [
      'It describes tendencies and cannot predict behaviour in all situations.',
      'It is not a diagnostic test. The results should be reviewed with my psychologist, along with my personal experiences and circumstances.',
    ],
  },
  {
    n: 2,
    heading: 'What will happen',
    paragraphs: [
      'I will rate each statement according to how well it describes me. My responses will be scored for each trait, and a qualified psychologist will review them with me in a feedback session.',
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
    heading: 'Possible risks and benefits',
    paragraphs: [
      'The risks are small. I may find some statements uncomfortable or reflect on myself in ways I did not expect, and I can tell my psychologist if this happens. A possible benefit is a clearer understanding of my personality traits. No outcome is guaranteed.',
    ],
  },
  {
    n: 6,
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
    n: 7,
    heading: 'My rights',
    paragraphs: [
      'I can ask questions about the assessment at any time, ask to see my report, ask for errors to be corrected, and ask how my information is stored and used.',
    ],
  },
  {
    n: 8,
    heading: 'Declaration',
    paragraphs: [
      'I have read this form (or it has been read and explained to me in a language I understand). I have had the chance to ask questions, and I understand the purpose, limits and confidentiality of this assessment. I give my consent to take part voluntarily.',
    ],
    // The paper form ends with a signature line; online this is the agreement tick.
    declaration: 'I have read and understood this form, and I give my consent to take part.',
  },
];

export const CONSENT_NOTE =
  'The Big Five Personality Assessment provides insights into an individual’s personality traits and tendencies. However, the tool alone cannot provide a complete understanding of an individual’s personality or predict behaviour across all situations. You are advised to schedule a session with your therapist to review and interpret the results in the context of your personal experiences, behavioural patterns, and individual circumstances.';
