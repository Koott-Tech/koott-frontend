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
            ["priceLabel", "Price label"],
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

      <EditorSection title="What is this?" sectionKey="what-is-this">
        <div>
          <Field label="Eyebrow">
            <TextInput value={cms.whatIsThis.eyebrow} onChange={(v) => patch((p) => ({ ...p, whatIsThis: { ...p.whatIsThis, eyebrow: v } }))} />
          </Field>
          <Field label="Title">
            <TextInput value={cms.whatIsThis.title} onChange={(v) => patch((p) => ({ ...p, whatIsThis: { ...p.whatIsThis, title: v } }))} />
          </Field>
          <Field label="Body">
            <TextInput value={cms.whatIsThis.body} onChange={(v) => patch((p) => ({ ...p, whatIsThis: { ...p.whatIsThis, body: v } }))} rows={5} />
          </Field>
          <p className="mt-4 text-sm text-gray-800" style={{ fontWeight: 500 }}>
            Three bullets
          </p>
          {(cms.whatIsThis.bullets || []).map((b, i) => (
            <div key={i} className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="min-w-0">
                <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Text
                </span>
                <TextInput value={b.text} onChange={(v) => patch((p) => {
                  const bullets = [...(p.whatIsThis.bullets || [])];
                  bullets[i] = { ...bullets[i], text: v };
                  return { ...p, whatIsThis: { ...p.whatIsThis, bullets } };
                })} rows={2} />
              </div>
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection title="Speakers" sectionKey="speakers">
        <div>
          <Field label="Section eyebrow">
            <TextInput value={cms.speakers.eyebrow} onChange={(v) => patch((p) => ({ ...p, speakers: { ...p.speakers, eyebrow: v } }))} />
          </Field>
          <Field label="Section heading">
            <TextInput value={cms.speakers.heading} onChange={(v) => patch((p) => ({ ...p, speakers: { ...p.speakers, heading: v } }))} />
          </Field>
          <Field label="Auto-advance (ms)">
            <input
              type="number"
              className="box-border w-full min-w-0 max-w-[12rem] rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={cms.speakers.autoAdvanceMs || 6000}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  speakers: { ...p.speakers, autoAdvanceMs: parseInt(e.target.value, 10) || 6000 },
                }))
              }
            />
          </Field>
          {(cms.speakers.items || []).map((sp, i) => (
            <div key={i} className="mt-4 min-w-0 max-w-full space-y-2 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 text-sm text-gray-800" style={{ fontWeight: 500 }}>
                  Speaker {i + 1}
                </span>
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() =>
                    patch((p) => ({
                      ...p,
                      speakers: {
                        ...p.speakers,
                        items: (p.speakers.items || []).filter((_, j) => j !== i),
                      },
                    }))
                  }
                >
                  Remove
                </button>
              </div>
              {["name", "designation", "experience", "image", "details", "languages", "focus", "style"].map((f) => (
                <Field key={f} label={f}>
                  {f === "image" ? (
                    <ImageUrlField
                      value={sp[f]}
                      onChange={(v) =>
                        patch((p) => {
                          const items = [...(p.speakers.items || [])];
                          items[i] = { ...items[i], image: v };
                          return { ...p, speakers: { ...p.speakers, items } };
                        })
                      }
                      uploading={!!uploadingByKey[`speakerImage-${i}`]}
                      inputId={`event-cms-speaker-image-upload-${i}`}
                      onUpload={(file) =>
                        uploadImageAndApply(file, `speakerImage-${i}`, (url) =>
                          patch((p) => {
                            const items = [...(p.speakers.items || [])];
                            items[i] = { ...items[i], image: url };
                            return { ...p, speakers: { ...p.speakers, items } };
                          })
                        )
                      }
                      placeholder="/speakers/name.webp or https://..."
                    />
                  ) : (
                    <TextInput
                      value={sp[f]}
                      onChange={(v) =>
                        patch((p) => {
                          const items = [...(p.speakers.items || [])];
                          items[i] = { ...items[i], [f]: v };
                          return { ...p, speakers: { ...p.speakers, items } };
                        })
                      }
                      rows={f === "details" ? 3 : 1}
                    />
                  )}
                </Field>
              ))}
            </div>
          ))}
          <button
            type="button"
            className="mt-3 text-sm text-[#025545] hover:underline"
            style={{ fontWeight: 500 }}
            onClick={() =>
              patch((p) => ({
                ...p,
                speakers: { ...p.speakers, items: [...(p.speakers.items || []), emptySpeaker()] },
              }))
            }
          >
            + Add speaker
          </button>
        </div>
      </EditorSection>

      <EditorSection title="Why it matters" sectionKey="why-it-matters">
        <div className="space-y-3">
          <Field label="Eyebrow">
            <TextInput value={cms.whyItMatters.eyebrow} onChange={(v) => patch((p) => ({ ...p, whyItMatters: { ...p.whyItMatters, eyebrow: v } }))} />
          </Field>
          <Field label="Heading">
            <TextInput value={cms.whyItMatters.heading} onChange={(v) => patch((p) => ({ ...p, whyItMatters: { ...p.whyItMatters, heading: v } }))} rows={2} />
          </Field>
          <Field label="Body">
            <TextInput value={cms.whyItMatters.body} onChange={(v) => patch((p) => ({ ...p, whyItMatters: { ...p.whyItMatters, body: v } }))} rows={5} />
          </Field>
          <Field label="CTA label">
            <TextInput value={cms.whyItMatters.ctaLabel} onChange={(v) => patch((p) => ({ ...p, whyItMatters: { ...p.whyItMatters, ctaLabel: v } }))} />
          </Field>
          <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>
            Outcome cards (4)
          </p>
          {(cms.whyItMatters.outcomeCards || []).map((c, i) => (
            <div key={i} className="grid min-w-0 max-w-full gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)]">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                Icon fixed: {c.iconKey || "LineChart"}
              </div>
              <div className="min-w-0 space-y-2">
                <TextInput
                  placeholder="Title"
                  value={c.title}
                  onChange={(v) =>
                    patch((p) => {
                      const outcomeCards = [...(p.whyItMatters.outcomeCards || [])];
                      outcomeCards[i] = { ...outcomeCards[i], title: v };
                      return { ...p, whyItMatters: { ...p.whyItMatters, outcomeCards } };
                    })
                  }
                />
                <TextInput
                  placeholder="Body"
                  value={c.body}
                  onChange={(v) =>
                    patch((p) => {
                      const outcomeCards = [...(p.whyItMatters.outcomeCards || [])];
                      outcomeCards[i] = { ...outcomeCards[i], body: v };
                      return { ...p, whyItMatters: { ...p.whyItMatters, outcomeCards } };
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection title="Who can join" sectionKey="who-can-join">
        <div className="space-y-3">
          <Field label="Heading">
            <TextInput value={cms.whoCanJoin.heading} onChange={(v) => patch((p) => ({ ...p, whoCanJoin: { ...p.whoCanJoin, heading: v } }))} />
          </Field>
          <Field label="Badge">
            <TextInput value={cms.whoCanJoin.badge} onChange={(v) => patch((p) => ({ ...p, whoCanJoin: { ...p.whoCanJoin, badge: v } }))} />
          </Field>
          {(cms.whoCanJoin.columns || []).map((col, i) => (
            <div key={i} className="min-w-0 max-w-full space-y-2 rounded-lg border p-3">
              <TextInput
                placeholder="Column label"
                value={col.label}
                onChange={(v) =>
                  patch((p) => {
                    const columns = [...(p.whoCanJoin.columns || [])];
                    columns[i] = { ...columns[i], label: v };
                    return { ...p, whoCanJoin: { ...p.whoCanJoin, columns } };
                  })
                }
              />
              <TextInput
                placeholder="Column body"
                value={col.body}
                onChange={(v) =>
                  patch((p) => {
                    const columns = [...(p.whoCanJoin.columns || [])];
                    columns[i] = { ...columns[i], body: v };
                    return { ...p, whoCanJoin: { ...p.whoCanJoin, columns } };
                  })
                }
                rows={2}
              />
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection title="Session banner (lower ticket)" sectionKey="session-banner">
        <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2">
          {["passLabel", "strikePrice", "priceLarge", "badgeText", "title", "subtitle", "ctaText"].map((key) => (
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

      <EditorSection title="Take back" sectionKey="take-back">
        <div>
          <Field label="Title">
            <TextInput value={cms.takeBack.title} onChange={(v) => patch((p) => ({ ...p, takeBack: { ...p.takeBack, title: v } }))} />
          </Field>
          <Field label="Body">
            <TextInput value={cms.takeBack.body} onChange={(v) => patch((p) => ({ ...p, takeBack: { ...p.takeBack, body: v } }))} rows={3} />
          </Field>
          {(cms.takeBack.items || []).map((item, i) => (
            <div key={i} className="mt-2 flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 sm:w-36 sm:shrink-0">
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                  Icon fixed: {item.iconKey || "Heart"}
                </div>
              </div>
              <div className="min-w-0 w-full flex-1 sm:min-w-0">
                <TextInput
                  value={item.text}
                  onChange={(v) =>
                    patch((p) => {
                      const items = [...(p.takeBack.items || [])];
                      items[i] = { ...items[i], text: v };
                      return { ...p, takeBack: { ...p.takeBack, items } };
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection title="Reviews" sectionKey="reviews">
        <div>
          <Field label="Section title">
            <TextInput value={cms.reviews.title} onChange={(v) => patch((p) => ({ ...p, reviews: { ...p.reviews, title: v } }))} />
          </Field>
          {(cms.reviews.items || []).map((r, i) => (
            <div key={i} className="mt-3 min-w-0 max-w-full space-y-2 rounded-lg border p-3">
              <TextInput
                placeholder="Author"
                value={r.author}
                onChange={(v) =>
                  patch((p) => {
                    const items = [...(p.reviews.items || [])];
                    items[i] = { ...items[i], author: v };
                    return { ...p, reviews: { ...p.reviews, items } };
                  })
                }
              />
              <TextInput
                placeholder="Text"
                value={r.text}
                onChange={(v) =>
                  patch((p) => {
                    const items = [...(p.reviews.items || [])];
                    items[i] = { ...items[i], text: v };
                    return { ...p, reviews: { ...p.reviews, items } };
                  })
                }
                rows={3}
              />
              <TextInput
                placeholder="Avatar URL"
                value={r.avatarUrl}
                onChange={(v) =>
                  patch((p) => {
                    const items = [...(p.reviews.items || [])];
                    items[i] = { ...items[i], avatarUrl: v };
                    return { ...p, reviews: { ...p.reviews, items } };
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
