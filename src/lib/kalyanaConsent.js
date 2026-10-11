/**
 * Informed consent text for Kalyana Raman, transcribed from the practice's consent PDF
 * (Informed_Consent_KalyanaRaman).
 *
 * Section numbering differs from the other two forms: the either/or choice sits in section 8
 * and the declaration in section 10 (DASS uses 7 and 9, Big Five 6 and 8). The submit handler
 * passes 8 to consentFrom(), so keep these in step if the form is ever renumbered.
 */

export const CONSENT_TITLE = 'Informed Consent for Psychological Assessment';
export const CONSENT_SUBTITLE = 'Kalyana Raman: Pre-Marital Readiness Assessment';

export const CONSENT_SECTIONS = [
  {
    n: 1,
    heading: 'About this assessment',
    paragraphs: [
      'Kalyana Raman is a structured, mostly open-ended assessment that helps me think about and discuss marriage before it happens. It covers 10 areas: expectations of marriage, communication and conflict, roles and boundaries, family and values, finances and career, children and intimacy, health, personality and past relationships, trust and safety, and future responsibilities.',
    ],
    bullets: [
      'It is not a diagnostic instrument or a pass/fail test.',
      'It gives no total score, no ranking and no verdict about whether a couple will succeed.',
      "It is used to guide discussion, together with individual interviews and my psychologist's professional judgement.",
    ],
  },
  {
    n: 2,
    heading: 'What will happen',
    paragraphs: [
      'I will complete the questionnaire privately, in my own words, without discussing my answers with my partner beforehand. A qualified psychologist will review my responses, meet me for an individual interview, and may compare themes across both partners’ responses. A joint feedback session will be held only if it is safe and I agree to it.',
    ],
  },
  {
    n: 3,
    heading: 'Voluntary participation and disclosure',
    paragraphs: [
      'My participation is voluntary. I may skip any question, take a break, or withdraw at any time without any penalty. Questions on health, psychological care, substance use and past relationships are invitations to share what I consider relevant, and having received care will not be treated as a sign that I am unsuitable for marriage.',
    ],
  },
  {
    n: 4,
    heading: 'My individual responses and my partner',
    paragraphs: [
      'My individual responses will not be shared with my partner without my consent, except where safety, the law or professional ethics require action. My partner will complete a separate consent form.',
    ],
  },
  {
    n: 5,
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
    n: 6,
    heading: 'Safety',
    paragraphs: [
      'Questions about fear, control, violence, coercion and consent will be discussed with me individually, and never in a joint session if that could increase risk. If I have any safety concern, I can raise it privately with my psychologist at any time.',
    ],
  },
  {
    n: 7,
    heading: 'Possible risks and benefits',
    paragraphs: [
      'Some questions may bring up difficult feelings or show differences between me and my partner. I can tell my psychologist if this happens. Possible benefits include a clearer understanding of my own expectations and a safe, structured way to talk about them. No outcome is guaranteed.',
    ],
  },
  {
    n: 8,
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
    n: 9,
    heading: 'My rights',
    paragraphs: [
      'I can ask questions about the assessment at any time, ask to see my report, ask for errors to be corrected, and ask how my information is stored and used.',
    ],
  },
  {
    n: 10,
    heading: 'Declaration',
    paragraphs: [
      'I have read this form (or it has been read and explained to me in a language I understand). I have had the chance to ask questions, and I understand the purpose, limits and confidentiality of this assessment. I give my consent to take part voluntarily.',
    ],
    // The paper form ends with a signature line; online this is the agreement tick.
    declaration: 'I have read and understood this form, and I give my consent to take part.',
  },
];

// Matches the note pre-printed on the Kalyana letterhead, so the screen and the PDF agree.
export const CONSENT_NOTE =
  'The Kalyana Raman Premarital Readiness Assessment explores relationship expectations, personal values, and areas that may require further discussion before marriage. However, the assessment results alone cannot determine compatibility or reliably predict marital success. You are advised to schedule a session with your therapist for the triangulation process, during which your assessment results will be reviewed alongside your therapist’s observations and relevant information gathered through professional discussion. This process aims to develop a more comprehensive understanding of your responses, identify areas of alignment or discrepancy, and highlight topics that may benefit from further exploration.';
