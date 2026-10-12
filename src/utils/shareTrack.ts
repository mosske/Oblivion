import type { Track } from "../types";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Direct YouTube / YouTube Music link for a track. */
export const getTrackShareUrl = (track?: Partial<Track> | null): string => {
  if (!track) return "";
  const id = [track.youtubeVideoId, track.youtubeId, track.id].find(
    (v): v is string => typeof v === "string" && YT_ID.test(v)
  );
  const isVideo = track.isVideo || track.mediaType === "video";
  if (id) {
    const host = isVideo ? "https://www.youtube.com" : "https://music.youtube.com";
    return `${host}/watch?v=${id}`;
  }
  // No usable video id: fall back to a search link so the recipient still lands on the song
  const q = encodeURIComponent([track.title, track.artist].filter(Boolean).join(" "));
  return q ? `https://music.youtube.com/search?q=${q}` : "";
};

const showToast = (message: string) => {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = message;
  el.setAttribute("role", "status");
  Object.assign(el.style, {
    position: "fixed",
    left: "50%",
    bottom: "120px",
    transform: "translateX(-50%)",
    zIndex: "2147483000",
    padding: "10px 16px",
    borderRadius: "9999px",
    background: "rgba(20,20,24,0.94)",
    color: "#ffffff",
    font: "600 13px system-ui, sans-serif",
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
    pointerEvents: "none",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 2200);
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy copy */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
};

/**
 * Opens the device's native share sheet (WhatsApp, Email, Messages...) with the
 * direct YouTube link. Where the Web Share API is unavailable (e.g. desktop
 * Firefox) the link is copied to the clipboard instead.
 */
export const shareTrack = async (track?: Partial<Track> | null): Promise<void> => {
  const url = getTrackShareUrl(track);
  if (!track || !url) {
    showToast("Nothing to share yet");
    return;
  }
  const title = [track.title, track.artist].filter(Boolean).join(" - ");

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return; // user closed the share sheet
    }
  }

  const copied = await copyToClipboard(url);
  showToast(copied ? "Link copied to clipboard" : url);
};
