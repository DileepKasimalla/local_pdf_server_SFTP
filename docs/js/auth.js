import { PORTAL_USER, PORTAL_PASS } from "./config.js";

const AUTH_KEY = "pdf_portal_logged_in";

export function isLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

export function login(username, password) {
  if (username === PORTAL_USER && password === PORTAL_PASS) {
    sessionStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = "index.html";
}

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
  }
}
