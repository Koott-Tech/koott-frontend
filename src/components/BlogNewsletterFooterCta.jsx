"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const WA_NEWSLETTER = "919539007766";

const overlayTransition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] };
const panelTransition = { duration: 0.26, ease: [0.4, 0, 0.2, 1] };

export default function BlogNewsletterFooterCta() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setStatus("idle");
    setSubmitError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
  }, [open]);

  const handleExitComplete = useCallback(() => {
    document.body.style.overflow = "";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !agreed) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, consent: true }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setSubmitError(
          typeof data.error === "string" ? data.error : "Could not save your email. Please try again."
        );
        return;
      }
      const text = encodeURIComponent(
        `Hi! I'd like to subscribe to the MyKoott newsletter.\n\nEmail: ${trimmed}\n\nI agree to receive the newsletter. I understand MyKoott sends at most one email per month.`
      );
      window.open(`https://wa.me/${WA_NEWSLETTER}?text=${text}`, "_blank", "noopener,noreferrer");
      setStatus("sent");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="w-full py-12 md:py-14 px-8 md:px-16 lg:px-24"
        style={{
          background: "linear-gradient(to bottom, #f2fff1, #d7fec5, #d7fec5)",
        }}
      >
        <div className="text-center max-w-2xl mx-auto px-4">
          <p className="text-sm font-semibold text-[#025545] mb-2">Confused where to start</p>
          <h4 className="mb-2 font-semibold text-gray-900 text-xl sm:text-[1.35rem] md:text-[1.5rem] leading-snug tracking-tight">
            Start Creating a Better Family Life Today
          </h4>
          <p className="footer-description text-sm md:text-base text-gray-700 mb-6 max-w-full">
            Join our community for trusted guidance, parenting insights, and mental health tips designed to help your
            family feel more connected, calm, and confident.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setOpen(true);
            }}
            className="text-white px-5 py-2.5 md:px-7 md:py-2.5 rounded-3xl text-sm md:text-base font-semibold transition-all duration-200 shadow-sm"
            style={{ backgroundColor: "#025545" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#012f23")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#025545")}
          >
            Subscribe to updates
          </button>
        </div>
      </div>

      <AnimatePresence onExitComplete={handleExitComplete}>
        {open && (
          <motion.div
            key="blog-newsletter-overlay"
            className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-8 md:p-10"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
              aria-label="Close dialog"
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-[201] w-full max-w-[480px] rounded-2xl border border-gray-200/80 bg-white px-6 py-6 shadow-xl sm:px-8 sm:py-8"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={panelTransition}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 sm:right-5 sm:top-5"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {status === "sent" ? (
                <div className="px-1 py-2 text-center sm:px-2">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </div>
                  <p className="text-base font-semibold text-gray-900" role="status">
                    Open WhatsApp to finish
                  </p>
                  <p className="mt-2 text-sm text-gray-500">Send the message in the new tab.</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-6 w-full rounded-xl bg-[#025545] py-3 text-sm font-semibold text-white hover:bg-[#012f23]"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div className="pr-10 sm:pr-12">
                    <div
                      id={titleId}
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl"
                    >
                      Newsletter
                    </div>
                    <p className="mt-2 text-sm font-medium leading-snug text-gray-600">
                      We only send one email per month—no spam.
                    </p>
                  </div>

                  <label htmlFor="blog-newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="blog-newsletter-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/20"
                  />

                  <label className="flex cursor-pointer items-start gap-3 text-left text-sm leading-relaxed text-gray-600">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[#025545] focus:ring-[#025545]"
                    />
                    <span>I agree to receive emails (max 1/month). I can unsubscribe anytime.</span>
                  </label>

                  {submitError && (
                    <p className="text-sm text-red-600" role="alert">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!agreed || submitting}
                    className="w-full rounded-xl bg-[#025545] py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-[#012f23] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? "Saving…" : "Continue on WhatsApp"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
