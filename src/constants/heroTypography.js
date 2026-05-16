/**
 * Blog-only typography (not globals.css). Body / card copy uses a fixed 20px line height.
 * Display headings keep proportional line-height so large sizes are not clipped.
 * Letter-spacing: -0.7px across blog listing + post UI.
 * Use on `div[role="heading"]` so global `h1 { … !important }` does not override.
 *
 * Globals use `body, span, li, a, … { letter-spacing: 0.010em !important }` — Tailwind
 * `tracking-*` loses. Apply BLOG_TYPOGRAPHY_ROOT_CLASS on the blog page wrapper and inject
 * BLOG_TYPOGRAPHY_ROOT_CSS once so `letter-spacing: -0.7px !important` wins.
 */
export const BLOG_TYPOGRAPHY_ROOT_CLASS = 'blog-typography-root';

/** Beats globals’ 0.010em !important on all descendants (higher specificity than bare `span`). */
export const BLOG_TYPOGRAPHY_ROOT_CSS = `
.blog-typography-root,
.blog-typography-root * {
  letter-spacing: -0.7px !important;
}
`.trim();

/** Same tokens as blog — use on `/events` and event detail pages for matching DM Sans / Work Sans + tracking. */
export const EVENTS_TYPOGRAPHY_ROOT_CLASS = BLOG_TYPOGRAPHY_ROOT_CLASS;
export const EVENTS_TYPOGRAPHY_ROOT_CSS = BLOG_TYPOGRAPHY_ROOT_CSS;

/**
 * Inline / body images inside `.blog-content` (HTML + rich text). The featured banner
 * is rendered outside `.blog-content`, so it stays full width.
 */
export const BLOG_BODY_IMAGE_MAX_WIDTH = '92%';

/** Paragraph copy on blog listing + excerpts (`<p>`) — 24px line height */
export const BLOG_BODY_LINE_HEIGHT_CLASS = 'leading-[24px]';

/** Card / meta rows (not `<p>`) — keep tighter line height */
export const BLOG_UI_LINE_HEIGHT_CLASS = 'leading-[20px]';

/** Optional Tailwind tracking (root CSS above is authoritative). */
export const BLOG_LETTER_SPACING_CLASS = 'tracking-[-0.7px]';

export const HERO_DISPLAY_HEADING_CLASS =
  `font-semibold text-[32px] leading-[1.1] ${BLOG_LETTER_SPACING_CLASS} md:text-[60px] md:leading-[1.1]`;

export const HERO_DISPLAY_HEADING_STYLE = {
  fontFamily: "'DM Sans', Arial, Helvetica, sans-serif",
  fontWeight: 600,
  letterSpacing: '-0.7px',
};

/** Featured story title — proportional line-height (not 20px; font size is large) */
export const BLOG_FEATURED_TITLE_CLASS =
  `font-semibold text-[26px] leading-[1.2] ${BLOG_LETTER_SPACING_CLASS} md:text-[30px] md:leading-[1.15] lg:text-[34px] lg:leading-[1.1]`;

export const BLOG_FEATURED_TITLE_STYLE = {
  fontFamily: "'DM Sans', Arial, Helvetica, sans-serif",
  fontWeight: 600,
  letterSpacing: '-0.7px',
};

/** Grid cards + related-posts cards (div titles, not `<p>`) */
export const BLOG_CARD_TITLE_CLASS =
  `mt-2 font-semibold text-gray-900 text-left break-words line-clamp-2 ${BLOG_LETTER_SPACING_CLASS} text-[15px] md:text-[16px] ${BLOG_UI_LINE_HEIGHT_CLASS}`;

export const BLOG_CARD_TITLE_STYLE = {
  fontFamily: "'DM Sans', Arial, Helvetica, sans-serif",
  fontWeight: 600,
  letterSpacing: '-0.7px',
};

/** Section titles on blog post (“You might also like”) */
export const BLOG_SECTION_HEADING_CLASS =
  `font-semibold text-[22px] leading-[1.2] ${BLOG_LETTER_SPACING_CLASS} md:text-[24px] md:leading-[1.15] text-gray-900 mb-6`;

export const BLOG_SECTION_HEADING_STYLE = {
  fontFamily: "'DM Sans', Arial, Helvetica, sans-serif",
  fontWeight: 600,
  letterSpacing: '-0.7px',
};

/** Intro / excerpt / featured blurb — 24px line height on `<p>` + -0.7px tracking */
export const HERO_BODY_TEXT_CLASS = `hero-description text-base md:text-lg ${BLOG_BODY_LINE_HEIGHT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`;

export const HERO_BODY_TEXT_STYLE = {
  fontFamily: "'Work Sans', Arial, Helvetica, sans-serif",
  letterSpacing: '-0.7px',
  lineHeight: '24px',
};
