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

  const uploadDocumentAndApply = async (file, key, applyUrl) => {
    setUploading(key, true);
    try {
      const res = await adminApi.uploadDocument(file);
      const url = res?.data?.url || res?.url;
      const originalName = res?.data?.filename || res?.filename || file.name;
      if (!url) {
        throw new Error(res?.message || "Document upload failed");
      }
      applyUrl(url, originalName);
    } catch (err) {
      alert(err?.message || "Failed to upload document");
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
            <Field label="Hero Background Image (Optional)">
              <div className="text-sm text-gray-500 mb-2">Upload a background image for the top of the event page. If left blank, it defaults to the Event Poster.</div>
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

      <EditorSection title="Registration Settings" sectionKey="registration-hero">
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
        </div>
      </EditorSection>

      <EditorSection title="Event Materials" sectionKey="event-materials">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload materials (PDF, DOCX, PPTX) that will be shared with attendees. These will be linked in the Certificate email.
          </p>
          <div className="flex flex-col gap-3">
            {(cms.materials || []).map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <a href={m.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-[#025545] hover:underline">
                  {m.name}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    patch((p) => {
                      const mats = [...(p.materials || [])];
                      mats.splice(i, 1);
                      return { ...p, materials: mats };
                    })
                  }
                  className="ml-4 text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            
            <div className="flex items-center gap-2 mt-2">
              <input
                id="event-cms-material-upload"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadDocumentAndApply(file, "eventMaterials", (url, name) => {
                    patch((p) => ({
                      ...p,
                      materials: [...(p.materials || []), { name, url }]
                    }));
                  });
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="event-cms-material-upload"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {uploadingByKey.eventMaterials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingByKey.eventMaterials ? "Uploading..." : "Upload Material"}
              </label>
            </div>
          </div>
        </div>
      </EditorSection>
      
      <EditorSection title="Certificate Settings" sectionKey="certificate-settings">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Custom Certificate Template (Optional)">
              <div className="text-sm text-gray-500 mb-2">Upload a custom blank certificate background for this event. Leave blank to use the default Koott template.</div>
              <ImageUrlField
                value={cms.certificateTemplateUrl}
                onChange={(v) => patch((p) => ({ ...p, certificateTemplateUrl: v }))}
                uploading={!!uploadingByKey.certificateTemplate}
                inputId="event-cms-cert-template-upload"
                onUpload={(file) =>
                  uploadImageAndApply(file, "certificateTemplate", (url) =>
                    patch((p) => ({ ...p, certificateTemplateUrl: url }))
                  )
                }
                placeholder="/events/cert_template.png or https://..."
              />
              <div className="mt-4 flex justify-center">
                {cms.certificateTemplateUrl && (
                  <img src={cms.certificateTemplateUrl} alt="Template preview" className="h-64 w-auto rounded-xl object-cover shadow-sm border border-gray-200" />
                )}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Custom Certificate Paragraph (Optional)">
              <div className="text-sm text-gray-500 mb-2">Use {'{{participant_name}}'} as a placeholder for the attendee's name. Leave blank to use the default generated paragraph.</div>
              <textarea
                className="w-full border p-2 rounded"
                rows={4}
                value={cms.certificateText || ''}
                onChange={(e) => patch((p) => ({ ...p, certificateText: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}
