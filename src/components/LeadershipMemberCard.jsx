"use client";

import Image from "next/image";
import { normalizeImageUrl } from "@/utils/urlNormalizer";

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b =
    parts.length > 1
      ? parts[parts.length - 1]?.[0] || ""
      : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
}

/**
 * Single member card — same layout as About → Leadership (image 320×320 area, name, title).
 * Omit `image` to show initials on a soft branded background.
 */
const nameHeadingClass = "text-sm md:text-base font-medium text-gray-900 mb-1";

export default function LeadershipMemberCard({
  name,
  title,
  image,
  className = "w-80",
  nameTag: NameTag = "h5",
  /** Use div+role for pages that avoid semantic h* (e.g. events). */
  useAccessibleNameHeading = false,
  /**
   * When true, image area grows with the photo (no fixed 320×320 box) so nothing is clipped.
   * Uses object-contain + intrinsic height — full image visible, letterboxing only if needed.
   */
  naturalImageHeight = false,
}) {
  const safeTitle = title ?? "";

  // Natural height only when there is a photo; initials still use a fixed tile.
  const imageShellClass =
    naturalImageHeight && image
      ? "w-full overflow-hidden rounded-[10px] bg-gradient-to-br from-[#025545]/10 to-[#025545]/5"
      : "h-80 w-full overflow-hidden rounded-[10px] leadership-image-container";

  return (
    <div className={`${className} bg-white rounded-2xl overflow-hidden`}>
      <div className={imageShellClass} suppressHydrationWarning>
        {image ? (
          <Image
            src={normalizeImageUrl(image)}
            alt={`${name}${safeTitle ? ` — ${safeTitle}` : ""}`}
            width={320}
            height={naturalImageHeight ? 400 : 320}
            className={
              naturalImageHeight
                ? "w-full h-auto max-w-full object-contain object-center"
                : "w-full h-full object-contain object-center"
            }
            style={naturalImageHeight ? { width: "100%", height: "auto" } : undefined}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#025545]/12 to-[#025545]/5"
            aria-hidden
          >
            <span className="text-4xl font-medium text-[#025545] tracking-tight select-none">
              {initialsFromName(name)}
            </span>
          </div>
        )}
      </div>
      <div className="px-0 py-6">
        {useAccessibleNameHeading ? (
          <div className={`${nameHeadingClass} font-sans`} role="heading" aria-level={3}>
            {name}
          </div>
        ) : (
          <NameTag className={nameHeadingClass}>{name}</NameTag>
        )}
        {safeTitle ? <p className="text-gray-600">{safeTitle}</p> : null}
      </div>
    </div>
  );
}
