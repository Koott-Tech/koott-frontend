'use client';

/** Default follow-up tier shown on child specialist profile booking UI */
export const DEFAULT_CHILD_SPEC_FU_TIER = '3';

/**
 * Themed session-count select for child specialist follow-up rows (MyKoott purple palette).
 * @param {boolean} [compact] — tighter padding/height for dense follow-up rows
 */
export default function ChildSpecSessionSelect({ value, onChange, ariaLabel, options, compact = false }) {
  const selectClass = compact
    ? 'appearance-none w-full cursor-pointer rounded-md border border-[#025545]/40 bg-gradient-to-b from-[#f2fff1] to-[#f2ecff] py-0.5 pl-1.5 pr-6 text-[11px] font-semibold leading-tight tracking-tight text-[#025545] shadow-sm transition-all hover:border-[#025545] hover:from-[#f2fff1] hover:to-[#d7fec5] focus:border-[#025545] focus:outline-none focus:ring-1 focus:ring-[#025545]/30'
    : 'appearance-none w-full cursor-pointer rounded-lg border border-[#025545]/40 bg-gradient-to-b from-[#f2fff1] to-[#f2ecff] py-2 pl-3 pr-9 text-xs font-semibold tracking-tight text-[#025545] shadow-[0_1px_3px_rgba(63,46,115,0.1)] transition-all hover:border-[#025545] hover:from-[#f2fff1] hover:to-[#d7fec5] hover:shadow-[0_2px_8px_rgba(63,46,115,0.14)] focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/35';

  return (
    <div className={compact ? 'relative w-[7.75rem] shrink-0' : 'relative min-w-[10rem] shrink-0'}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        className={selectClass}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className={`pointer-events-none absolute text-[#025545] ${compact ? 'right-1 top-1/2 -translate-y-1/2' : 'right-2.5 top-1/2 -translate-y-1/2'}`}
        aria-hidden
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={compact ? 'h-3 w-3 opacity-90' : 'h-4 w-4 opacity-90'}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  );
}
