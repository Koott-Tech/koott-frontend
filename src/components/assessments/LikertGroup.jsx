'use client';

/**
 * A numbered statement with a row of options, used by Big Five and DASS-21.
 *
 * Two layouts. On phones the option row sits beneath the statement, each option showing its
 * number and a short label, so nothing has to scroll sideways. From `sm` up it becomes the
 * matrix layout with a sticky header row, which is quicker to fill on a wide screen.
 */
export default function LikertGroup({ items, scale, min, value, onChange, prompt }) {
  const cols = `minmax(0,1fr) repeat(${scale.length}, 64px)`;

  return (
    <>
      {/* Legend — phones only. The matrix header below carries this on wider screens. */}
      <ul className="sm:hidden text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
        {scale.map((s, i) => (
          <li key={i}><span className="font-medium text-slate-700">{i + min}</span> &nbsp;{s}</li>
        ))}
      </ul>

      {/* Matrix header — sm and up */}
      <div className="hidden sm:grid gap-2 text-[11px] text-slate-500 sticky top-16 bg-white py-2 z-10 border-b border-slate-100"
           style={{ gridTemplateColumns: cols }}>
        <span>{prompt}</span>
        {scale.map((s, i) => (
          <span key={i} className="text-center leading-tight">{i + min}<br /><span className="text-[10px]">{s}</span></span>
        ))}
      </div>

      {items.map((item) => {
        const answered = value[item.n] !== undefined;
        return (
          <div key={item.n}
               className={`py-3 border-b border-slate-100 ${answered ? '' : 'bg-amber-50/40'} sm:grid sm:gap-2 sm:items-center sm:py-2`}
               style={{ gridTemplateColumns: cols }}>
            <p className="text-sm text-slate-700 sm:pr-3 mb-2.5 sm:mb-0">
              <span className="text-slate-400 mr-1.5">{item.n}.</span>{item.text}
            </p>

            {/* Phone: one evenly spaced row of labelled targets */}
            <div className="flex sm:hidden justify-between gap-1">
              {scale.map((_, i) => {
                const v = i + min;
                const on = value[item.n] === v;
                return (
                  <button key={v} type="button" onClick={() => onChange(item.n, v)}
                    aria-label={`${item.text}: ${v}`} aria-pressed={on}
                    className={`flex-1 h-11 rounded-lg border text-sm font-medium transition ${
                      on ? 'bg-[#0B5345] text-white border-[#0B5345]' : 'bg-white text-slate-500 border-slate-300'}`}>
                    {v}
                  </button>
                );
              })}
            </div>

            {/* sm and up: radios aligned under the header */}
            {scale.map((_, i) => {
              const v = i + min;
              return (
                <div key={v} className="hidden sm:flex justify-center">
                  <input type="radio" name={`q${item.n}`} value={v} checked={value[item.n] === v}
                    onChange={() => onChange(item.n, v)}
                    className="w-4 h-4 accent-[#0B5345] cursor-pointer" aria-label={`${item.n}: ${v}`} />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
