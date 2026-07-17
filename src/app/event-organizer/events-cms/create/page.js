"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/backendApi";

export default function CreateEventPageCmsPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const base =
    pathname.startsWith("/superadmin/admin/events-cms") ? "/superadmin/admin/events-cms" : "/event-organizer/events-cms";
  const [eventTitle, setEventTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [seoTitleEdited, setSeoTitleEdited] = useState(false);
  const [seoDescriptionEdited, setSeoDescriptionEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const slugify = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated() || (!hasRole("event_organizer") && !hasRole("admin") && !hasRole("superadmin"))) router.push("/");
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const submit = async (e) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError("Please enter an event title or slug.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await adminApi.createEventPage({
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
        status,
        seo_title: seoTitle,
        seo_description: seoDescription,
        canonical_url: `https://www.koott.in/events/${slug.trim().toLowerCase().replace(/\s+/g, "-")}`,
        cms_data: {},
      });
      if (res?.success && res.data?.id) {
        router.push(`${base}/${res.data.id}/edit`);
      } else {
        setError(res?.message || res?.error || "Create failed");
      }
    } catch (err) {
      setError(err?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center text-gray-600">Loading…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">New event page</h1>
      <p className="text-sm text-gray-600 mb-6">Content uses site defaults until you edit sections.</p>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Event title</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={eventTitle}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setEventTitle(nextTitle);
              const generatedSlug = slugify(nextTitle);
              if (!slugEdited) setSlug(generatedSlug);
              if (!seoTitleEdited) setSeoTitle(nextTitle ? `${nextTitle} | Events` : "");
              if (!seoDescriptionEdited) {
                setSeoDescription(
                  nextTitle
                    ? `Join ${nextTitle} on MyKoott. Workshop details, schedule, and registration.`
                    : ""
                );
              }
            }}
            placeholder="e.g. Parenting Communication Workshop"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">URL slug</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Public URL: /events/{slug.trim() || "your-event-slug"}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">SEO title</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={seoTitle}
            onChange={(e) => {
              setSeoTitleEdited(true);
              setSeoTitle(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">SEO description</label>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={3}
            value={seoDescription}
            onChange={(e) => {
              setSeoDescriptionEdited(true);
              setSeoDescription(e.target.value);
            }}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#189e4f] text-white px-5 py-2.5 rounded-lg hover:bg-[#189e4f] disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create & edit content"}
          </button>
          <button type="button" onClick={() => router.push(base)} className="px-4 py-2.5 text-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
