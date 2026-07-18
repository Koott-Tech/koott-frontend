"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { adminApi } from "@/lib/backendApi";


function Field({ label, children }) {
  return (
    <div className="mb-4 min-w-0 max-w-full">
      <label
        className="mb-1 block break-words text-xs uppercase leading-snug text-gray-700"
        style={{ fontWeight: 500 }}
      >
        {label}
      </label>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, rows = 1, type = "text", ...rest }) {
  const cls =
    "box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#025545] focus:ring-1 focus:ring-[#025545]";
  if (rows > 1) {
    return <textarea className={cls} rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)} {...rest} />;
  }
  return <input type={type} className={cls} value={value || ""} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function ImageUrlField({
  value,
  onChange,
  uploading,
  onUpload,
  inputId,
  placeholder = "/events/your-image.webp or https://...",
}) {
  return (
    <div className="space-y-2">
      <TextInput value={value} onChange={onChange} placeholder={placeholder} />
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            // Allow selecting same file again
            e.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading..." : "Upload image"}
        </label>
      </div>
    </div>
  );
}


/** Always-visible section card (replaces collapsible details). */
function EditorSection({ title, children, sectionKey }) {
  return (
    <div
      className="mb-4 min-w-0 max-w-full overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      data-editor-section={sectionKey || undefined}
    >
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#025545]/6 to-transparent px-4 py-3">
        {/* div not h3: globals.css forces h3 { font-size: 36px !important } site-wide */}
        <div
          role="heading"
          aria-level={3}
          className="break-words text-[#025545]"
          style={{
            fontSize: "0.8125rem",
            lineHeight: "1.25rem",
            fontWeight: 500,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          {title}
        </div>
      </div>
      <div className="min-w-0 max-w-full p-4">{children}</div>
    </div>
  );
}

/**
 * Full workshop event page CMS editor (merged shape from mergeWorkshopEventCms).
 */
export default function EventWorkshopCmsForm({ cms, setCms }) {
  const [uploadingByKey, setUploadingByKey] = useState({});
  const patch = (updater) => setCms((prev) => updater(structuredClone(prev)));
  const setUploading = (key, value) =>
    setUploadingByKey((prev) => ({
      ...prev,
      [key]: value,
    }));

  const uploadImageAndApply = async (file, key, applyUrl) => {
    setUploading(key, true);
    try {
      const res = await adminApi.uploadImage(file);
      const imageUrl = res?.data?.url || res?.url;
      if (!imageUrl) {
        throw new Error(res?.message || "Image upload failed");
      }
      applyUrl(imageUrl);
    } catch (err) {
      alert(err?.message || "Failed to upload image");
    } finally {
      setUploading(key, false);
    }
  };

  const emptySpeaker = () => ({
    name: "",
    designation: "",
    experience: "",
    image: "",
    details: "",
    languages: "",
    focus: "",
    style: "",
  });

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <EditorSection title="Core Event Details (Poster & Info)" sectionKey="core-details">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Event Poster">
              <ImageUrlField
                value={cms.posterUrl}
                onChange={(v) => patch((p) => ({ ...p, posterUrl: v }))}
                uploading={!!uploadingByKey.posterImage}
                inputId="event-cms-poster-upload"
                onUpload={(file) =>
                  uploadImageAndApply(file, "posterImage", (url) =>
                    patch((p) => ({ ...p, posterUrl: url }))
                  )
                }
                placeholder="/events/poster.webp or https://..."
              />
              <div className="mt-4 flex justify-center">
                {cms.posterUrl && (
                  <img src={cms.posterUrl} alt="Poster preview" className="h-64 w-auto rounded-xl object-cover shadow-sm border border-gray-200" />
                )}
              </div>
            </Field>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Topic">
              <TextInput value={cms.topic} onChange={(v) => patch((p) => ({ ...p, topic: v }))} />
            </Field>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Speaker">
              <TextInput value={cms.speaker} onChange={(v) => patch((p) => ({ ...p, speaker: v }))} />
            </Field>
          </div>

          <Field label="Date">
            <TextInput value={cms.date} onChange={(v) => patch((p) => ({ ...p, date: v }))} placeholder="e.g. Sat, 18 April 2026" />
          </Field>

          <Field label="Time">
            <TextInput value={cms.time} onChange={(v) => patch((p) => ({ ...p, time: v }))} placeholder="e.g. 11:00 AM IST" />
          </Field>

          <Field label="Method">
            <select
              className="box-border w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#025545] focus:ring-1 focus:ring-[#025545]"
              value={cms.method || "Online"}
              onChange={(e) => patch((p) => ({ ...p, method: e.target.value }))}
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </Field>
        </div>
      </EditorSection>

      <EditorSection title="Registration & hero image" sectionKey="registration-hero">
        <div className="space-y-3">
          <Field label="Register event slug (API)">
            <TextInput
              value={cms.registerEventSlug}
              onChange={(v) => patch((p) => ({ ...p, registerEventSlug: v }))}
              placeholder="MyKoott-summer-workshops-2026"
            />
          </Field>
          <Field label="Event Mode">
            <select
              className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#025545] focus:outline-none focus:ring-1 focus:ring-[#025545]"
              value={cms.eventMode || 'online'}
              onChange={(e) => patch((p) => ({ ...p, eventMode: e.target.value }))}
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          {cms.eventMode !== 'online' && (
            <Field label="Event Location (for Offline/Hybrid)">
              <TextInput
                value={cms.eventLocation ?? ""}
                onChange={(v) => patch((p) => ({ ...p, eventLocation: v }))}
                placeholder="e.g. MyKoott Office, Bangalore"
              />
            </Field>
          )}
          <Field label="Session join link (Google Meet, Zoom, etc.) — required when published">
            <TextInput
              value={cms.sessionJoinUrl ?? ""}
              onChange={(v) => patch((p) => ({ ...p, sessionJoinUrl: v }))}
              placeholder="https://meet.google.com/…"
            />
          </Field>
          <Field label="Hero background image URL">
            <ImageUrlField
              value={cms.heroImageUrl}
              onChange={(v) => patch((p) => ({ ...p, heroImageUrl: v }))}
              uploading={!!uploadingByKey.heroImageUrl}
              inputId="event-cms-hero-image-upload"
              onUpload={(file) =>
                uploadImageAndApply(file, "heroImageUrl", (url) =>
                  patch((p) => ({ ...p, heroImageUrl: url }))
                )
              }
            />
          </Field>
          <Field label="Hero image alt">
            <TextInput value={cms.heroImageAlt} onChange={(v) => patch((p) => ({ ...p, heroImageAlt: v }))} rows={2} />
          </Field>
          <Field label="Events page card image URL">
            <ImageUrlField
              value={cms.eventListCard?.imageUrl}
              onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, imageUrl: v } }))}
              uploading={!!uploadingByKey.eventCardImage}
              inputId="event-cms-card-image-upload-top"
              onUpload={(file) =>
                uploadImageAndApply(file, "eventCardImage", (url) =>
                  patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, imageUrl: url } }))
                )
              }
              placeholder="/events/your-cover.webp or https://..."
            />
          </Field>
          <Field label="Events page card schedule (date/time text)">
            <TextInput
              value={cms.eventListCard?.scheduleText}
              onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, scheduleText: v } }))}
              placeholder="e.g. Sat, 18 April at 11:00 AM IST"
            />
          </Field>
        </div>
      </EditorSection>

      <EditorSection title="Hero copy" sectionKey="hero-copy">
        <div>
          <Field label="Eyebrow">
            <TextInput value={cms.hero.eyebrow} onChange={(v) => patch((p) => ({ ...p, hero: { ...p.hero, eyebrow: v } }))} />
          </Field>
          <Field label="Title">
            <TextInput value={cms.hero.title} onChange={(v) => patch((p) => ({ ...p, hero: { ...p.hero, title: v } }))} rows={3} />
          </Field>
          <Field label="Body">
            <TextInput value={cms.hero.body} onChange={(v) => patch((p) => ({ ...p, hero: { ...p.hero, body: v } }))} rows={4} />
          </Field>
        </div>
      </EditorSection>

      <EditorSection title="Events listing card" sectionKey="events-list-card">
        <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2">
          <Field label="Category">
            <TextInput
              value={cms.eventListCard?.category}
              onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, category: v } }))}
            />
          </Field>
          <Field label="Organizer">
            <TextInput
              value={cms.eventListCard?.organizer}
              onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, organizer: v } }))}
            />
          </Field>
          <Field label="Card title">
            <TextInput
              value={cms.eventListCard?.title}
              onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, title: v } }))}
              rows={2}
            />
          </Field>
          <Field label="Card image URL">
            <ImageUrlField
              value={cms.eventListCard?.imageUrl}
              onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, imageUrl: v } }))}
              uploading={!!uploadingByKey.eventCardImage}
              inputId="event-cms-card-image-upload-listing"
              onUpload={(file) =>
                uploadImageAndApply(file, "eventCardImage", (url) =>
                  patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, imageUrl: url } }))
                )
              }
              placeholder="/events/your-cover.webp or https://..."
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Card description">
              <TextInput
                value={cms.eventListCard?.description}
                onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, description: v } }))}
                rows={3}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Schedule text (optional override)">
              <TextInput
                value={cms.eventListCard?.scheduleText}
                onChange={(v) => patch((p) => ({ ...p, eventListCard: { ...p.eventListCard, scheduleText: v } }))}
                placeholder="e.g. Sat, 18 April at 11:00 AM IST"
              />
            </Field>
          </div>
        </div>
      </EditorSection>

      <EditorSection title="Hero ticket card" sectionKey="hero-ticket">
        <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2">
          {[
            ["admitLabel", "ADMIT ONE"],
            ["seriesLine", "Series line"],
            ["sessionTitle", "Session title"],
            ["datetimeLine", "Date / time line"],
            ["sessionPassLabel", "Session pass label"],
            ["registerCta", "Register button"],
            ["helperText", "Helper text"],
          ].map(([key, lab]) => (
            <Field key={key} label={lab}>
              <TextInput
                value={cms.ticketCard[key]}
                onChange={(v) => patch((p) => ({ ...p, ticketCard: { ...p.ticketCard, [key]: v } }))}
                rows={key === "helperText" ? 2 : 1}
              />
            </Field>
          ))}
        </div>
      </EditorSection>


      <EditorSection title="Session banner (lower ticket)" sectionKey="session-banner">
        <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2">
          {["passLabel", "badgeText", "title", "subtitle", "ctaText"].map((key) => (
            <Field key={key} label={key}>
              <TextInput
                value={cms.sessionBanner[key]}
                onChange={(v) => patch((p) => ({ ...p, sessionBanner: { ...p.sessionBanner, [key]: v } }))}
                rows={key === "subtitle" ? 2 : 1}
              />
            </Field>
          ))}
          <p className="col-span-full text-sm text-gray-800" style={{ fontWeight: 500 }}>
            Detail row (Date / Time / Format)
          </p>
          {(cms.sessionBanner.details || []).slice(0, 3).map((d, i) => (
            <div key={i} className="col-span-full grid min-w-0 max-w-full gap-2 rounded bg-gray-50 p-2 sm:grid-cols-2">
              <TextInput
                placeholder="Label"
                value={d.label}
                onChange={(v) =>
                  patch((p) => {
                    const details = [...(p.sessionBanner.details || [])];
                    details[i] = { ...details[i], label: v };
                    return { ...p, sessionBanner: { ...p.sessionBanner, details } };
                  })
                }
              />
              <TextInput
                placeholder="Value"
                value={d.value}
                onChange={(v) =>
                  patch((p) => {
                    const details = [...(p.sessionBanner.details || [])];
                    details[i] = { ...details[i], value: v };
                    return { ...p, sessionBanner: { ...p.sessionBanner, details } };
                  })
                }
              />
            </div>
          ))}
        </div>
      </EditorSection>



      <EditorSection title="Registration modal" sectionKey="registration-modal">
        <div>
          <Field label="Title">
            <TextInput value={cms.registerModal.title} onChange={(v) => patch((p) => ({ ...p, registerModal: { ...p.registerModal, title: v } }))} />
          </Field>
          <Field label="Subtitle">
            <TextInput value={cms.registerModal.subtitle} onChange={(v) => patch((p) => ({ ...p, registerModal: { ...p.registerModal, subtitle: v } }))} rows={2} />
          </Field>
        </div>
      </EditorSection>
    </div>
  );
}
