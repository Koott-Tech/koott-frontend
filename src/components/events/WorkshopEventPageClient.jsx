"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Gift,
  X,
  CheckCircle2,
} from "lucide-react";
import Reviews from "@/components/Reviews";
import {
  PHONE_COUNTRY_OPTIONS,
  DEFAULT_PHONE_COUNTRY_VALUE,
  dialFromPhoneCountryValue,
} from "@/data/phoneCountryCodes";
import { mergeWorkshopEventCms } from "@/data/workshopEventPageCms";
import { getEventPageLucideIcon } from "@/lib/eventPageLucideIcon";
import {
  BLOG_TYPOGRAPHY_ROOT_CLASS,
  BLOG_TYPOGRAPHY_ROOT_CSS,
  BLOG_LETTER_SPACING_CLASS,
  BLOG_UI_LINE_HEIGHT_CLASS,
  BLOG_CARD_TITLE_CLASS,
  BLOG_CARD_TITLE_STYLE,
  BLOG_FEATURED_TITLE_CLASS,
  BLOG_FEATURED_TITLE_STYLE,
  BLOG_SECTION_HEADING_CLASS,
  BLOG_SECTION_HEADING_STYLE,
  HERO_DISPLAY_HEADING_CLASS,
  HERO_DISPLAY_HEADING_STYLE,
  HERO_BODY_TEXT_CLASS,
  HERO_BODY_TEXT_STYLE,
} from "@/constants/heroTypography";

/** Shorter ticket copy: drop year, end of time range, and video-app names in parentheses. */
function formatSessionBannerDetailDisplay(label, value) {
  if (value == null || typeof value !== "string") return value;
  let s = value.trim();
  const l = (label || "").toLowerCase();

  if (l.includes("date")) {
    s = s.replace(/\b20\d{2}\b/g, "").replace(/\s*,\s*$/g, "").replace(/\s{2,}/g, " ").trim();
  }

  if (l.includes("time")) {
    const tz = s.match(/\s+\b(IST|UTC|GMT|ET|PT|EST|PST|CET|GST)\b\s*$/i);
    const tzSuffix = tz ? ` ${tz[1]}` : "";
    const dash = s.search(/\s+-\s+/);
    if (dash !== -1) s = s.slice(0, dash).trim() + tzSuffix;
  }

  if (l.includes("format") || l.includes("where") || l.includes("venue") || l.includes("location")) {
    s = s
      .replace(/\s*\(?\s*Google\s+Meet\s*\)?/gi, "")
      .replace(/\s*\(?\s*Zoom\s*\)?/gi, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (/^online\s*$/i.test(s)) s = "Online";
  }

  return s || value.trim();
}

/** Hero ticket — event title/subtitle stay in hero copy; shows pass type, up to 3 labeled details, price. */
function HeroMiniPassTicket({ cms, targetId = "session-pass-ticket" }) {
  const b = cms.sessionBanner;
  if (!b) return null;

  const detailRows = (b.details || []).slice(0, 3);

  const scrollToPass = useCallback(() => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetId]);

  return (
    <button
      type="button"
      onClick={scrollToPass}
      className="group relative w-full max-w-full overflow-hidden rounded-2xl border border-white/45 bg-white text-left shadow-[0_18px_44px_-14px_rgba(0,0,0,0.48)] ring-1 ring-[#3f2e73]/12 transition-[transform,box-shadow] hover:shadow-[0_22px_50px_-14px_rgba(63,46,115,0.42)] active:scale-[0.997] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#3f2e73]/40 sm:rounded-[1.35rem]"
      aria-label={`View full pass below${b.title ? `: ${b.title}` : ""}`}
    >
      <span className="sr-only">
        {b.title}
        {b.subtitle ? ` ${b.subtitle}` : ""}
      </span>
      <div
        className="pointer-events-none absolute right-0 top-0 h-12 w-12 bg-[#3f2e73] sm:h-14 sm:w-14"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3f2e73] via-[#7b68b8] to-[#3f2e73] sm:h-1.5"
        aria-hidden
      />

      <div className="relative flex w-full flex-col sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1 px-5 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 md:px-7 md:pb-6 md:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[#3f2e73]/22 pb-3 sm:pb-3.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3f2e73]/75 sm:text-[11px]">{b.passLabel}</span>
            <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full border border-emerald-300/85 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold leading-tight text-emerald-800 sm:max-w-[13rem] sm:text-[10px]">
              <Gift className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              <span className="line-clamp-1">{b.badgeText}</span>
            </span>
          </div>

          {detailRows.length > 0 ? (
            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:mt-4 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-4">
              {detailRows.map((d) => (
                <div key={d.label} className="min-w-0 text-left">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-[#3f2e73]/58 sm:text-[10px]">{d.label}</p>
                  <p className={`mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#1a1428] sm:text-[0.9375rem] ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                    {formatSessionBannerDetailDisplay(d.label, d.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-row items-center justify-between gap-4 border-t border-dashed border-[#3f2e73]/22 bg-[#faf8ff] px-5 py-3.5 sm:w-[9.5rem] sm:flex-none sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-4 sm:py-5 md:w-[10.5rem]">
          <div className="flex flex-col items-start leading-none sm:items-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#3f2e73]/55 sm:text-[11px]">Price</span>
            <span className="mt-1 text-xs font-medium text-gray-400 line-through sm:text-sm">{b.strikePrice}</span>
            <span className="mt-1 text-3xl font-bold tabular-nums text-[#2f2358] sm:text-4xl">{b.priceLarge}</span>
          </div>
          <ChevronDown
            className="h-7 w-7 shrink-0 text-[#3f2e73] transition-transform group-hover:translate-y-1 sm:h-8 sm:w-8"
            aria-hidden
          />
        </div>
      </div>
    </button>
  );
}

/** Full session ticket (page section below hero). */
function SessionPassTicket({ cms, onRegister, titleId }) {
  const b = cms.sessionBanner;
  if (!b) return null;

  return (
    <section
      id="session-pass-ticket"
      className="relative scroll-mt-24 overflow-hidden rounded-3xl border border-[#3f2e73]/20 bg-white shadow-[0_18px_48px_-22px_rgba(63,46,115,0.45)] sm:scroll-mt-28"
      aria-labelledby={titleId}
    >
      <div
        className="pointer-events-none absolute right-0 top-0 h-16 w-16 bg-[#3f2e73]"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#3f2e73] via-[#7b68b8] to-[#3f2e73]"
        aria-hidden
      />

      <div className="grid lg:grid-cols-[240px_1fr]">
        <div className="relative border-b border-[#3f2e73]/15 bg-[#f4f1ff] p-6 lg:border-b-0 lg:border-r lg:border-[#3f2e73]/15">
          <p className="text-[10px] font-semibold uppercase text-[#3f2e73]/70">{b.passLabel}</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-lg font-medium text-gray-400 line-through">{b.strikePrice}</span>
            <span className="text-4xl font-bold text-[#2f2358]">{b.priceLarge}</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Gift className="h-3 w-3 shrink-0" aria-hidden />
            {b.badgeText}
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <h2
            id={titleId}
            className={`text-gray-900 ${BLOG_SECTION_HEADING_CLASS} mb-0`}
            style={BLOG_SECTION_HEADING_STYLE}
          >
            {b.title}
          </h2>
          <p className={`mt-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
            {b.subtitle}
          </p>

          <div className="mt-5 grid gap-0 rounded-2xl border border-[#3f2e73]/14 bg-white sm:grid-cols-3">
            {(b.details || []).slice(0, 3).map((d, i) => (
              <div
                key={d.label}
                className={`p-4 sm:border-[#3f2e73]/12 ${i < 2 ? "sm:border-r" : ""} ${i > 0 ? "border-t sm:border-t-0" : ""}`}
              >
                <p className="text-[10px] font-semibold uppercase text-[#3f2e73]/60">{d.label}</p>
                <p className="mt-1 text-sm font-semibold text-[#2a1f52]">{formatSessionBannerDetailDisplay(d.label, d.value)}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onRegister}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#3f2e73] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#3f2e73]/25 transition-all hover:bg-[#342560] hover:shadow-xl hover:shadow-[#3f2e73]/30 sm:w-auto"
          >
            {b.ctaText}
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Workshop / event landing page driven by CMS (`event_pages.cms_data`), merged with defaults.
 * @param {{ cms?: object, previewMode?: boolean, onPreviewSectionClick?: (sectionKey: string) => void }} props — partial cms_data from API; omitted fields use site defaults. When previewMode, registration submit is a no-op.
 */
export default function WorkshopEventPageClient({
  cms: cmsPartial,
  previewMode = false,
  onPreviewSectionClick,
} = {}) {
  const cms = mergeWorkshopEventCms(cmsPartial);
  const speakers = Array.isArray(cms.speakers?.items) ? cms.speakers.items : [];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryValue, setPhoneCountryValue] = useState(DEFAULT_PHONE_COUNTRY_VALUE);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [speakerIndex, setSpeakerIndex] = useState(0);
  const [speakerPhase, setSpeakerPhase] = useState("idle");
  const [speakerDirection, setSpeakerDirection] = useState(1);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const jumpToEditorSection = useCallback(
    (sectionKey, event) => {
      if (!previewMode || !onPreviewSectionClick || !sectionKey) return;
      const interactive = event?.target?.closest?.(
        "button,a,input,select,textarea,[role='button'],[role='link']"
      );
      if (interactive) return;
      onPreviewSectionClick(sectionKey);
    },
    [previewMode, onPreviewSectionClick]
  );
  const [registerPhase, setRegisterPhase] = useState("form");

  const openRegisterModal = useCallback((e) => {
    e?.preventDefault?.();
    setRegisterPhase("form");
    setRegisterModalOpen(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setRegisterModalOpen(false);
    setRegisterPhase("form");
    setStatus("idle");
    setMessage("");
  }, []);

  useEffect(() => {
    if (!registerModalOpen) return;
    const onKey = (ev) => {
      if (ev.key === "Escape") closeRegisterModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [registerModalOpen, closeRegisterModal]);

  useEffect(() => {
    if (registerModalOpen) {
      setRegisterPhase("form");
      setStatus("idle");
      setMessage("");
    }
  }, [registerModalOpen]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (previewMode) {
        setStatus("idle");
        setMessage("Preview only — use Save in the admin toolbar to publish changes.");
        return;
      }
      setStatus("loading");
      setMessage("");
      try {
        const res = await fetch("/api/events/workshop-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            countryCode: dialFromPhoneCountryValue(phoneCountryValue),
            phone,
            eventSlug: cms.registerEventSlug || "Koott-summer-workshops-2026",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setStatus("error");
          setMessage(data.error || "This email is already registered for this event.");
          return;
        }
        if (!res.ok || !data.success) {
          setStatus("error");
          setMessage(data.error || "Could not submit. Please try again.");
          return;
        }
        setFullName("");
        setEmail("");
        setPhone("");
        setPhoneCountryValue(DEFAULT_PHONE_COUNTRY_VALUE);
        setStatus("idle");
        setMessage("");
        setRegisterPhase("success");
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    },
    [fullName, email, phoneCountryValue, phone, closeRegisterModal, cms.registerEventSlug, previewMode]
  );

  const activeSpeaker = speakers[speakerIndex] || speakers[0];

  const changeSpeaker = useCallback((nextIndex, direction = 1) => {
    if (nextIndex === speakerIndex) return;
    setSpeakerDirection(direction);
    setSpeakerPhase("out");
    setTimeout(() => {
      setSpeakerIndex(nextIndex);
      setSpeakerPhase("in");
      setTimeout(() => setSpeakerPhase("idle"), 20);
    }, 220);
  }, [speakerIndex]);

  const goPrevSpeaker = () => {
    if (!speakers.length) return;
    const next = (speakerIndex - 1 + speakers.length) % speakers.length;
    changeSpeaker(next, -1);
  };

  const goNextSpeaker = () => {
    if (!speakers.length) return;
    const next = (speakerIndex + 1) % speakers.length;
    changeSpeaker(next, 1);
  };

  useEffect(() => {
    if (speakers.length <= 1) return undefined;
    const ms = Number(cms.speakers?.autoAdvanceMs) || 6000;
    const autoTimer = setInterval(() => {
      const next = (speakerIndex + 1) % speakers.length;
      changeSpeaker(next);
    }, ms);

    return () => clearInterval(autoTimer);
  }, [speakerIndex, changeSpeaker, speakers.length, cms.speakers?.autoAdvanceMs]);

  const heroSectionClass = previewMode
    ? "relative w-full min-h-[min(54vh,440px)] overflow-visible sm:min-h-[min(58vh,500px)] md:min-h-[min(62vh,560px)]"
    : "relative h-[100dvh] min-h-[100dvh] overflow-x-hidden overflow-y-auto md:overflow-y-hidden";

  return (
    <div
      className={`bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS} ${
        previewMode ? "relative min-h-0" : "min-h-screen"
      }`}
    >
      {previewMode ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Live preview — scroll to review the full page. Save in the editor to publish.
        </div>
      ) : null}
      <style dangerouslySetInnerHTML={{ __html: BLOG_TYPOGRAPHY_ROOT_CSS }} />
      {/* Hero — full viewport on site; bounded height in CMS preview so the builder scroll works */}
      <section className={heroSectionClass}>
        <Image
          src={cms.heroImageUrl}
          alt={cms.heroImageAlt || ""}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/55 to-black/40 md:from-black/65 md:via-black/45 md:to-black/25" />

        <div
          className={`relative z-10 mx-auto flex max-w-7xl flex-col justify-start px-4 sm:px-6 lg:px-8 ${
            previewMode
              ? "min-h-0 w-full justify-center py-8 sm:py-10 md:py-12"
              : "h-full justify-start pt-36 sm:pt-40 md:pt-44 lg:pt-48 xl:pt-52 pb-10 sm:pb-12 lg:pb-14"
          }`}
        >
          <div
            className={`grid lg:grid-cols-2 ${
              previewMode
                ? "min-h-0 gap-5 md:gap-6 lg:items-center lg:gap-8"
                : "min-h-0 flex-1 gap-10 lg:items-center lg:gap-12"
            }`}
          >
            {/* Hero copy — on the image / gradient only, not inside the ticket card */}
            <div
              className={`max-w-xl ${previewMode ? "min-w-0" : ""}`}
              onClick={previewMode ? (e) => jumpToEditorSection("hero-copy", e) : undefined}
            >
              <p className={`text-xs font-semibold uppercase text-white/80 ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
                {cms.hero.eyebrow}
              </p>
              <div
                className={`mt-3 text-white ${HERO_DISPLAY_HEADING_CLASS} ${
                  previewMode
                    ? "break-words [overflow-wrap:anywhere] text-[30px] leading-[1.08] sm:text-[38px] md:text-[46px] lg:text-[52px]"
                    : ""
                }`}
                role="heading"
                aria-level={1}
                style={HERO_DISPLAY_HEADING_STYLE}
              >
                {cms.hero.title}
              </div>
              <p
                className={`mt-4 text-white/90 ${previewMode ? "break-words [overflow-wrap:anywhere] text-[14px] leading-[1.55] sm:text-[15px]" : ""} ${HERO_BODY_TEXT_CLASS}`}
                style={HERO_BODY_TEXT_STYLE}
              >
                {cms.hero.body}
              </p>
              <div className={`flex flex-wrap gap-3 ${previewMode ? "mt-6" : "mt-8"}`}>
                <button
                  type="button"
                  onClick={openRegisterModal}
                  className={`inline-flex items-center gap-2 rounded-full bg-white font-semibold text-[#3f2e73] shadow-lg hover:bg-gray-50 transition-colors ${
                    previewMode ? "px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm" : "px-5 py-2.5 text-sm"
                  }`}
                >
                  Register
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href="/events"
                  className={`inline-flex items-center rounded-full border border-white/40 bg-white/10 font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors ${
                    previewMode ? "px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm" : "px-5 py-2.5 text-sm"
                  }`}
                >
                  All events
                </Link>
              </div>
            </div>

            <div
              className="flex w-full min-w-0 justify-end lg:justify-self-end"
              onClick={previewMode ? (e) => jumpToEditorSection("hero-ticket", e) : undefined}
            >
              <div className="w-full min-w-0 max-w-xl sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
                <HeroMiniPassTicket cms={cms} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content sections — CMS-like grids */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-28 sm:space-y-32 lg:space-y-36">
        <section
          className="relative overflow-hidden rounded-3xl border border-[#3f2e73]/20 bg-gradient-to-br from-[#f8f5ff] via-white to-[#eef6ff] p-6 sm:p-8"
          aria-labelledby="what-is-this-heading"
          onClick={previewMode ? (e) => jumpToEditorSection("what-is-this", e) : undefined}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#3f2e73]/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-[#7b68b8]/10 blur-xl" aria-hidden />

          <div className="relative">
            <p className={`inline-flex rounded-full border border-[#3f2e73]/20 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase text-[#3f2e73] ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
              {cms.whatIsThis.eyebrow}
            </p>
            <h2
              id="what-is-this-heading"
              className={`mt-3 text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
              style={BLOG_SECTION_HEADING_STYLE}
            >
              {cms.whatIsThis.title}
            </h2>
            <p className={`mt-4 max-w-3xl text-gray-700 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
              {cms.whatIsThis.body}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {(cms.whatIsThis.bullets || []).map((b) => {
                const Icon = getEventPageLucideIcon(b.iconKey);
                return (
                  <div key={b.text} className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3f2e73]/10 text-[#3f2e73]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className={`mt-3 text-gray-700 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>{b.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {speakers.length > 0 ? (
        <section
          aria-labelledby="event-speakers-heading"
          onClick={previewMode ? (e) => jumpToEditorSection("speakers", e) : undefined}
        >
          <div className="mb-8 sm:mb-10">
            <p className={`text-xs font-semibold uppercase text-[#3f2e73] ${BLOG_UI_LINE_HEIGHT_CLASS}`}>{cms.speakers.eyebrow}</p>
            <h2
              id="event-speakers-heading"
              className={`mt-3 text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
              style={BLOG_SECTION_HEADING_STYLE}
            >
              {cms.speakers.heading}
            </h2>
          </div>

          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="text-xs font-medium text-[#3f2e73]">
              {speakerIndex + 1} / {speakers.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrevSpeaker}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3f2e73]/20 text-[#3f2e73] hover:bg-[#f4f1ff] transition-colors"
                aria-label="Previous speaker"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNextSpeaker}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3f2e73]/20 text-[#3f2e73] hover:bg-[#f4f1ff] transition-colors"
                aria-label="Next speaker"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <article
            className={`grid gap-10 lg:grid-cols-2 lg:gap-14 items-start lg:items-center transition-all duration-500 ease-out ${
              speakerPhase === "out"
                ? speakerDirection === 1
                  ? "opacity-0 -translate-x-6"
                  : "opacity-0 translate-x-6"
                : speakerPhase === "in"
                  ? speakerDirection === 1
                    ? "opacity-0 translate-x-6"
                    : "opacity-0 -translate-x-6"
                  : "opacity-100 translate-x-0"
            }`}
          >
            {activeSpeaker ? (
            <div>
              <div className={`text-gray-900 ${BLOG_FEATURED_TITLE_CLASS}`} style={BLOG_FEATURED_TITLE_STYLE}>{activeSpeaker.name}</div>
              <p className={`mt-2 text-sm font-medium text-[#3f2e73] ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
                {activeSpeaker.designation} · {activeSpeaker.experience}
              </p>
              <p className={`mt-4 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>{activeSpeaker.details}</p>
              <div className="mt-4 space-y-2 text-xs sm:text-sm text-gray-700">
                <p><span className="font-semibold text-[#2a1f52]">Languages:</span> {activeSpeaker.languages}</p>
                <p><span className="font-semibold text-[#2a1f52]">Session focus:</span> {activeSpeaker.focus}</p>
                <p><span className="font-semibold text-[#2a1f52]">Approach:</span> {activeSpeaker.style}</p>
              </div>
            </div>
            ) : null}

            {activeSpeaker ? (
            <div className="relative w-full max-w-[220px] sm:max-w-[250px] lg:max-w-[280px] rounded-2xl overflow-hidden border border-gray-200 aspect-[3/4] mx-auto lg:ml-auto lg:mr-0">
              <Image
                src={activeSpeaker.image}
                alt={activeSpeaker.name}
                fill
                className="object-cover rounded-2xl"
                sizes="(min-width: 1024px) 280px, (min-width: 640px) 250px, 220px"
              />
            </div>
            ) : null}
          </article>

          <div className="mt-5 flex items-center gap-2">
            {speakers.map((speaker, idx) => (
              <button
                key={speaker.name}
                type="button"
                onClick={() => changeSpeaker(idx, idx > speakerIndex ? 1 : -1)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === speakerIndex ? "w-8 bg-[#3f2e73]" : "w-4 bg-[#3f2e73]/25"
                }`}
                aria-label={`Go to speaker ${idx + 1}`}
              />
            ))}
          </div>
        </section>
        ) : null}

        {/* Rula-style: centered headline, 4 soft cards, purple icons, pill CTA */}
        <section
          className="w-full py-2 sm:py-4"
          aria-labelledby="why-it-matters-heading"
          onClick={previewMode ? (e) => jumpToEditorSection("why-it-matters", e) : undefined}
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-0">
            <p className={`text-xs font-semibold uppercase text-[#3f2e73] ${BLOG_UI_LINE_HEIGHT_CLASS}`}>{cms.whyItMatters.eyebrow}</p>
            <h2
              id="why-it-matters-heading"
              className={`mt-3 text-gray-900 ${BLOG_FEATURED_TITLE_CLASS}`}
              style={BLOG_FEATURED_TITLE_STYLE}
            >
              {cms.whyItMatters.heading}
            </h2>
            <p className={`mt-4 text-gray-600 max-w-2xl mx-auto ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
              {cms.whyItMatters.body}
            </p>
          </div>

          {/* Wider than page column (max-w-6xl) so each card has more horizontal room */}
          <div className="relative left-1/2 right-auto mt-10 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip px-4 sm:px-6 lg:px-10">
            <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4 lg:gap-8">
              {(cms.whyItMatters.outcomeCards || []).map((card) => {
                const Icon = getEventPageLucideIcon(card.iconKey);
                return (
                  <div
                    key={card.title}
                    className="min-w-0 rounded-2xl bg-[#F2F2F2] p-7 text-left transition-shadow hover:shadow-md sm:p-8"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center text-[#3f2e73]" aria-hidden>
                      <Icon className="h-7 w-7" strokeWidth={1.5} />
                    </div>
                    <div className={`text-gray-900 ${BLOG_CARD_TITLE_CLASS}`} style={BLOG_CARD_TITLE_STYLE} role="heading" aria-level={3}>
                      {card.title}
                    </div>
                    <p className={`mt-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>{card.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 flex justify-center px-4">
            <button
              type="button"
              onClick={openRegisterModal}
              className="inline-flex items-center rounded-full bg-[#3f2e73] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#342560] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3f2e73] focus-visible:ring-offset-2"
            >
              {cms.whyItMatters.ctaLabel}
            </button>
          </div>
        </section>

        <section
          className="py-4"
          aria-labelledby="who-can-join-heading"
          onClick={previewMode ? (e) => jumpToEditorSection("who-can-join", e) : undefined}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-[#3f2e73]">
              <Users className="h-5 w-5" />
              <h2 id="who-can-join-heading" className={`text-gray-900 ${BLOG_SECTION_HEADING_CLASS} mb-0`} style={BLOG_SECTION_HEADING_STYLE}>
                {cms.whoCanJoin.heading}
              </h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-semibold text-[#3f2e73]">
              {cms.whoCanJoin.badge}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(cms.whoCanJoin.columns || []).map((col) => (
              <div key={col.label} className="border-l-2 border-[#3f2e73]/30 pl-4">
                <p className="text-[11px] font-semibold uppercase text-[#3f2e73]/60">{col.label}</p>
                <p className="mt-1 text-sm font-medium text-[#2a1f52]">{col.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div onClick={previewMode ? (e) => jumpToEditorSection("session-banner", e) : undefined}>
          <SessionPassTicket cms={cms} onRegister={openRegisterModal} titleId="ticket-heading" />
        </div>

        <section
          className="rounded-3xl border border-[#3f2e73]/18 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(63,46,115,0.08)]"
          onClick={previewMode ? (e) => jumpToEditorSection("take-back", e) : undefined}
        >
          <h2 className={`text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`} style={BLOG_SECTION_HEADING_STYLE}>
            {cms.takeBack.title}
          </h2>
          <p className={`mt-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
            {cms.takeBack.body}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(cms.takeBack.items || []).map((item) => {
              const Icon = getEventPageLucideIcon(item.iconKey);
              return (
                <div key={item.text} className="flex items-start gap-3 rounded-2xl border border-[#3f2e73]/12 bg-[#faf8ff] p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3f2e73]/12 text-[#3f2e73]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className={`text-sm sm:text-base text-[#2a1f52] ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div
        className={`mt-20 sm:mt-24 md:mt-28 ${previewMode ? "cursor-pointer" : ""}`}
        onClick={previewMode ? (e) => jumpToEditorSection("reviews", e) : undefined}
      >
        <Reviews
          cmsData={{
            title: cms.reviews.title,
            reviews: cms.reviews.items || [],
          }}
        />
      </div>

      <AnimatePresence>
        {registerModalOpen ? (
          <motion.div
            key="register-overlay"
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-5 md:p-6"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              aria-label="Close registration"
              onClick={closeRegisterModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={registerPhase === "form" ? "register-modal-title" : "register-success-title"}
              className="relative z-[101] w-full max-w-lg rounded-t-[1.25rem] sm:rounded-2xl bg-white px-6 pb-8 pt-9 shadow-2xl sm:max-w-xl sm:px-10 sm:pb-10 sm:pt-10 max-h-[min(92dvh,780px)] overflow-y-auto overflow-x-hidden"
              onClick={previewMode ? (e) => jumpToEditorSection("registration-modal", e) : undefined}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              <button
                type="button"
                onClick={closeRegisterModal}
                className="absolute right-5 top-5 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:right-6 sm:top-6"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <AnimatePresence mode="wait">
                {registerPhase === "form" ? (
                  <motion.div
                    key="register-form-phase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
                  >
                    <motion.div
                      id="register-modal-title"
                      className={`pr-12 text-gray-900 sm:pr-14 ${BLOG_SECTION_HEADING_CLASS}`}
                      role="heading"
                      aria-level={2}
                      style={BLOG_SECTION_HEADING_STYLE}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {cms.registerModal.title}
                    </motion.div>

                    <form onSubmit={onSubmit} className="mt-8 space-y-5">
                      {[
                        <div>
                          <label htmlFor="modal-fullName" className="block text-xs font-semibold text-gray-800 uppercase">
                            Full name
                          </label>
                          <input
                            id="modal-fullName"
                            name="fullName"
                            type="text"
                            autoComplete="name"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] leading-snug text-gray-900 outline-none ring-[#3f2e73]/20 focus:border-[#3f2e73] focus:ring-2 sm:text-sm"
                            placeholder="As on your email / phone"
                          />
                        </div>,
                        <div>
                          <label htmlFor="modal-email" className="block text-xs font-semibold text-gray-800 uppercase">
                            Email
                          </label>
                          <input
                            id="modal-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] leading-snug text-gray-900 outline-none ring-[#3f2e73]/20 focus:border-[#3f2e73] focus:ring-2 sm:text-sm"
                            placeholder="you@example.com"
                          />
                        </div>,
                        <div>
                          <span className="block text-xs font-semibold text-gray-800 uppercase">WhatsApp number</span>
                          <div className="mt-2 flex gap-2.5">
                            <select
                              name="countryCode"
                              value={phoneCountryValue}
                              onChange={(e) => setPhoneCountryValue(e.target.value)}
                              className="min-w-[11.5rem] max-w-[min(52vw,14rem)] shrink-0 rounded-xl border border-gray-200 bg-white px-2.5 py-3 text-[15px] text-gray-900 outline-none focus:border-[#3f2e73] focus:ring-2 ring-[#3f2e73]/20 sm:min-w-[13rem] sm:max-w-[15rem] sm:text-sm"
                              aria-label="Country code"
                            >
                              {PHONE_COUNTRY_OPTIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <input
                              id="modal-phone"
                              name="phone"
                              type="tel"
                              autoComplete="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] leading-snug text-gray-900 outline-none ring-[#3f2e73]/20 focus:border-[#3f2e73] focus:ring-2 sm:text-sm"
                              placeholder="WhatsApp number (10 digits)"
                            />
                          </div>
                        </div>,
                      ].map((node, i) => (
                        <motion.div
                          key={["fullName", "email", "phone"][i]}
                          initial={{ opacity: 0, x: -14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.38,
                            delay: 0.1 + i * 0.08,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          {node}
                        </motion.div>
                      ))}

                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.38, delay: 0.1 + 3 * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {message ? (
                          <p className="text-sm text-red-600" role="alert">
                            {message}
                          </p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={status === "loading"}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3f2e73] px-4 py-3.5 text-[15px] font-semibold text-white shadow-md hover:bg-[#342560] disabled:opacity-60 transition-colors sm:text-sm"
                        >
                          {status === "loading" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting…
                            </>
                          ) : (
                            "Submit registration"
                          )}
                        </button>
                      </motion.div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register-success-phase"
                    role="alert"
                    aria-live="polite"
                    className="px-2 pb-4 pt-2 text-center sm:px-4 sm:pb-2"
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-9 w-9" aria-hidden />
                    </div>
                    <div
                      id="register-success-title"
                      className={`mt-5 text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
                      role="heading"
                      aria-level={2}
                      style={BLOG_SECTION_HEADING_STYLE}
                    >
                      You&apos;re registered
                    </div>
                    <p className={`mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                      Your spot has been reserved. You&apos;ll get the join link by email and on WhatsApp.
                    </p>
                    <button
                      type="button"
                      onClick={closeRegisterModal}
                      className="mt-9 w-full rounded-xl bg-[#3f2e73] px-4 py-3.5 text-[15px] font-semibold text-white shadow-md hover:bg-[#342560] transition-colors sm:text-sm"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </div>
  );
}
