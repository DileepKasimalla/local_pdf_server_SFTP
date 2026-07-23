import { TTL_DAYS } from "./config.js";

const DOWNLOADED_KEY = "pdf_portal_downloaded";

function getDownloadedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DOWNLOADED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markDownloaded(name) {
  const set = getDownloadedSet();
  set.add(name);
  localStorage.setItem(DOWNLOADED_KEY, JSON.stringify([...set]));
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function expiresAt(iso) {
  const d = new Date(iso);
  d.setDate(d.getDate() + TTL_DAYS);
  return d;
}

function isExpired(iso) {
  return Date.now() > expiresAt(iso).getTime();
}

export async function loadManifest() {
  const res = await fetch(`pdfs/manifest.json?v=${Date.now()}`);
  if (!res.ok) {
    throw new Error("Could not load PDF list.");
  }
  const data = await res.json();
  const downloaded = getDownloadedSet();
  return (data.files || []).filter(
    (f) => !isExpired(f.uploaded) && !downloaded.has(f.name),
  );
}

export async function downloadPdf(file) {
  const url = `pdfs/${encodeURIComponent(file.name)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Download failed.");
  }
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(link.href);
  markDownloaded(file.name);
}
