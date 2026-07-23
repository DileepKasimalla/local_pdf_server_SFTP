import { PORTAL_USER, PORTAL_PASS } from "./config.js";

function authKey() {
  return window.location.pathname.includes("/upload/")
    ? "pdf_portal_upload_logged_in"
    : "pdf_portal_download_logged_in";
}

export function isLoggedIn() {
  return sessionStorage.getItem(authKey()) === "1";
}

export function login(username, password) {
  if (username === PORTAL_USER && password === PORTAL_PASS) {
    sessionStorage.setItem(authKey(), "1");
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(authKey());
  window.location.href = "index.html";
}

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
  }
}

export function getGithubToken() {
  return sessionStorage.getItem("github_token") || "";
}

export function setGithubToken(token) {
  if (token) {
    sessionStorage.setItem("github_token", token);
  } else {
    sessionStorage.removeItem("github_token");
  }
}
