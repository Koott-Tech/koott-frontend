"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/backendApi";
import { mergeWorkshopEventCms } from "@/data/workshopEventPageCms";
import EventWorkshopCmsForm from "@/components/admin/EventWorkshopCmsForm";
import EventWorkshopCmsEditorLayout from "@/components/admin/EventWorkshopCmsEditorLayout";
import WorkshopEventPageClient from "@/components/events/WorkshopEventPageClient";
import { Loader2 } from "lucide-react";

export default function EditEventPageCmsPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const base =
    pathname.startsWith("/superadmin/admin/events-cms") ? "/superadmin/admin/events-cms" : "/event-organizer/events-cms";
  const params = useParams();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [cmsForm, setCmsForm] = useState(null);
  const [status, setStatus] = useState("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);

  const showSaveError = useCallback((msg) => {
    setError(msg);
    const scroller = document.querySelector("[data-event-cms-editor-scroll='true']");
    if (scroller && typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const jumpEditorToSection = useCallback((sectionKey) => {
    if (!sectionKey) return;
    const node = document.querySelector(`[data-editor-section="${sectionKey}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    node.classList.add("ring-2", "ring-[#025545]/30");
    window.setTimeout(() => node.classList.remove("ring-2", "ring-[#025545]/30"), 1100);
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getEventPageAdmin(id);
      if (!res?.success || !res.data) {
        setError(res?.message || "Not found");
        setRow(null);
        setCmsForm(null);
        return;
      }
      const data = res.data;
      setRow(data);
      setStatus(data.status || "draft");
      setSeoTitle(data.seo_title || "");
      setSeoDescription(data.seo_description || "");
      setCanonicalUrl(data.canonical_url || "");
      setCmsForm(mergeWorkshopEventCms(data.cms_data));
    } catch (e) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated() || (!hasRole("event_organizer") && !hasRole("admin") && !hasRole("superadmin"))) {
        router.push("/");
        return;
      }
      load();
    }
  }, [authLoading, isAuthenticated, hasRole, router, load]);

  useEffect(() => {
    if (cmsForm) {
      setPreviewRevision((v) => v + 1);
    }
  }, [cmsForm]);

  const save = async (e) => {
    e?.preventDefault?.();
    if (!id || !cmsForm) {
      showSaveError("Could not save because editor state is not ready. Refresh and try again.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await adminApi.updateEventPage(id, {
        status,
        seo_title: seoTitle,
        seo_description: seoDescription,
        canonical_url: canonicalUrl || null,
        cms_data: cmsForm,
      });
      if (res?.success) {
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2800);
        setShowSavedPopup(true);
        window.setTimeout(() => setShowSavedPopup(false), 2600);
        if (res.data) {
          setRow(res.data);
        }
      } else {
        showSaveError(res?.message || "Save failed");
      }
    } catch (err) {
      showSaveError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#189e4f]" />
      </div>
    );
  }

  if (error && !row) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <button type="button" className="mt-4 text-[#189e4f] underline" onClick={() => router.push(base)}>
          Back to list
        </button>
      </div>
    );
  }

  const errorBanner =
    error && row ? (
      <div className="mb-4 break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-red-800">
        {error}
      </div>
    ) : null;

  return (
    <>
      <EventWorkshopCmsEditorLayout
        slug={row?.slug}
        savedFlash={savedFlash}
        onBack={() => router.push(base)}
        liveHref={`/events/${row?.slug}`}
        errorBanner={errorBanner}
        saveButton={
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-lg bg-[#189e4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#189e4f] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
        editor={
          <form id="event-cms-editor-form" onSubmit={save} className="min-w-0 max-w-full space-y-4">
            <div className="min-w-0 max-w-full space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {/* div not h3: globals.css h3 uses 36px !important */}
            <div
              role="heading"
              aria-level={3}
              className="border-b border-gray-100 pb-2 text-[#025545]"
              style={{
                fontSize: "0.8125rem",
                lineHeight: "1.25rem",
                fontWeight: 500,
                letterSpacing: "0.02em",
                margin: 0,
              }}
            >
              Publishing &amp; SEO
            </div>
            <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2">
                <label className="mb-1 block text-xs uppercase text-gray-600" style={{ fontWeight: 500 }}>
                  Status
                </label>
                <select
                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <label className="mb-1 block text-xs uppercase text-gray-600" style={{ fontWeight: 500 }}>
                  Canonical URL
                </label>
                <input
                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://www.koott.in/events/…"
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <label className="mb-1 block text-xs uppercase text-gray-600" style={{ fontWeight: 500 }}>
                  SEO title
                </label>
                <input
                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <label className="mb-1 block text-xs uppercase text-gray-600" style={{ fontWeight: 500 }}>
                  SEO description
                </label>
                <textarea
                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
            </div>
            </div>
            {cmsForm ? <EventWorkshopCmsForm cms={cmsForm} setCms={setCmsForm} /> : null}
          </form>
        }
        preview={
          cmsForm ? (
            <WorkshopEventPageClient
              key={previewRevision}
              cms={cmsForm}
              previewMode
              onPreviewSectionClick={jumpEditorToSection}
            />
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">Loading preview…</div>
          )
        }
      />
      {showSavedPopup ? (
        <div className="fixed bottom-5 right-5 z-[120] rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-800 shadow-xl">
          Saved successfully for event: <span className="font-semibold">{row?.slug || "this event"}</span>
        </div>
      ) : null}
    </>
  );
}
