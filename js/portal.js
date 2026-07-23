import { TTL_DAYS, GITHUB_REPO, PDFS_REPO_PATH } from "./config.js";
import { getGithubToken } from "./auth.js";

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

export function isExpired(iso) {
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

  const token = getGithubToken();
  if (token && GITHUB_REPO) {
    await deleteFromGithub(file.name, token).catch(() => {});
  }
}

async function deleteFromGithub(filename, token) {
  const path = `${PDFS_REPO_PATH}/${filename}`;
  const metaUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!metaRes.ok) {
    return;
  }
  const meta = await metaRes.json();
  await fetch(metaUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Remove downloaded PDF ${filename}`,
      sha: meta.sha,
    }),
  });
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadToGithub(file, token) {
  if (!GITHUB_REPO) {
    throw new Error("Set GITHUB_REPO in docs/js/config.js first.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!safeName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are allowed.");
  }
  const path = `${PDFS_REPO_PATH}/${safeName}`;
  const content = await fileToBase64(file);
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Upload PDF ${safeName}`,
      content,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed.");
  }
  return safeName;
}

export async function pushManifest(data, token) {
  if (!GITHUB_REPO) {
    throw new Error("Set GITHUB_REPO in docs/js/config.js first.");
  }
  const path = `${PDFS_REPO_PATH}/manifest.json`;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const json = JSON.stringify(data, null, 2);
  const content = btoa(unescape(encodeURIComponent(json)));
  const body = { message: "Update PDF manifest", content };
  const existing = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (existing.ok) {
    body.sha = (await existing.json()).sha;
  }
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Could not update manifest.");
  }
}
