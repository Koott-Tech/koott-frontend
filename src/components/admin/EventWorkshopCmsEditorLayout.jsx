"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";

/**
 * Full-viewport builder shell matching assessments / counselling page builders:
 * fixed inset, left editor drawer, main area = single scrollable live preview.
 */
export default function EventWorkshopCmsEditorLayout({
  slug,
  savedFlash,
  onBack,
  liveHref,
  saveButton,
  editor,
  preview,
  errorBanner,
}) {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col bg-gray-100">
      {showSidebar ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close editor"
          onClick={() => setShowSidebar(false)}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:overflow-hidden">
        {/* Editor sidebar — slide-over on mobile, persistent on md+ */}
        <aside
          className={[
            "fixed bottom-0 left-0 top-0 z-50 flex h-full max-h-[100dvh] w-[min(100vw,22rem)] min-h-0 min-w-0 flex-col border-r border-gray-200 bg-white shadow-xl sm:w-96 md:relative md:z-0 md:h-auto md:max-h-none md:w-[min(100%,24rem)] md:max-w-md md:flex-shrink-0 md:shadow-none",
            "transition-transform duration-200 ease-out",
            showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
        >
          <div className="flex flex-shrink-0 items-start justify-between gap-2 border-b border-gray-200 p-3 md:p-4">
            <div className="min-w-0 flex-1 pr-1">
              {/* div not h2: globals.css h2 uses 48px !important */}
              <div
                role="heading"
                aria-level={2}
                className="text-gray-800"
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: "1.25rem",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  margin: 0,
                }}
              >
                Event page builder
              </div>
              <p
                className="mt-0.5 break-all text-xs leading-snug text-gray-500"
                style={{ fontWeight: 400 }}
                title={slug ? `/events/${slug}` : undefined}
              >
                /events/{slug || "…"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              onClick={() => setShowSidebar(false)}
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            data-event-cms-editor-scroll="true"
          >
            <div className="min-w-0 max-w-full p-3 md:p-4">
              {errorBanner}
              {editor}
            </div>
          </div>
        </aside>

        {/* Preview + toolbar */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
          <header className="flex min-h-0 min-w-0 flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2.5 md:px-4">
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className="rounded-md bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 md:hidden"
              >
                Show editor
              </button>
              <button type="button" onClick={onBack} className="text-xs text-gray-500 hover:text-gray-800">
                ← Back to list
              </button>
            </div>
            <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
              {savedFlash ? (
                <span className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Saved
                </span>
              ) : null}
              <a
                href={liveHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                View live
              </a>
              {saveButton}
            </div>
          </header>

          {/* Single scroll surface for the whole page preview (like other CMS builders) */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-gray-200/80 md:overflow-y-auto">
            <div className="mx-auto min-h-full min-w-0 max-w-full bg-white shadow-sm">{preview}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
