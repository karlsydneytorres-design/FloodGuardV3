// ============================================================
//  scripts/map.js
//  Firestore-backed sensor state for the Map & Preparedness page
// ============================================================

import { db } from "./firebase-config.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const SENSOR_MAP = [
  { barangayId: "sulipan",     sensorId: "WLM-001", domSensorId: "1", name: "Sulipan Sensor (S1)" },
  { barangayId: "san_vicente", sensorId: "WLM-003", domSensorId: "2", name: "San Vicente Sensor (S2)" },
  { barangayId: "paligui",     sensorId: "WLM-002", domSensorId: "3", name: "Paligui Sensor (S3)" },
];

// ── Firestore doc ref ─────────────────────────────────────────────────────────
function sensorDocRef(barangayId, sensorId) {
  return doc(db, "sensor_toggles", `${barangayId}_${sensorId}`);
}

// ── Apply state to DOM ────────────────────────────────────────────────────────
function applySensorState(domSensorId, enabled) {
  const signal = document.querySelector(`.sensor-signal[data-sensor-id="${domSensorId}"]`);
  const card   = document.querySelector(`.status-card[data-sensor-id="${domSensorId}"]`);

  if (signal) {
    if (enabled) {
      signal.classList.remove("offline-sensor");
      signal.style.opacity = "1";
      signal.title = signal.title.replace(" (Disabled)", "");
    } else {
      signal.classList.add("offline-sensor");
      signal.style.opacity = "0.35";
      if (!signal.title.includes("(Disabled)")) signal.title += " (Disabled)";
    }
  }

  if (card) {
    const icon     = card.querySelector(".status-icon i");
    const subtitle = card.querySelector(".status-subtitle");

    if (enabled) {
      card.classList.remove("offline");
      if (icon) {
        icon.className = card.classList.contains("warning")
          ? "fas fa-exclamation-triangle"
          : "fas fa-check-circle";
      }
      if (subtitle && card.dataset.originalSubtitle) {
        subtitle.textContent = card.dataset.originalSubtitle;
      }
    } else {
      if (subtitle && !card.dataset.originalSubtitle) {
        card.dataset.originalSubtitle = subtitle.textContent;
      }
      card.classList.add("offline");
      if (icon)     icon.className    = "fas fa-times-circle";
      if (subtitle) subtitle.textContent = "Sensor Disabled";
    }
  }
}

// ── Subscribe to all sensor toggles in real-time ─────────────────────────────
function subscribeToSensorStates() {
  SENSOR_MAP.forEach(({ barangayId, sensorId, domSensorId }) => {
    onSnapshot(sensorDocRef(barangayId, sensorId), (snap) => {
      const enabled = snap.exists() ? (snap.data().enabled ?? false) : false;
      applySensorState(domSensorId, enabled);
    });
  });
}

// ── Sensor click popup ────────────────────────────────────────────────────────
function initSensorClickHandlers() {
  document.querySelectorAll(".sensor-signal").forEach((sensor) => {
    sensor.addEventListener("click", () => {
      const domId  = sensor.getAttribute("data-sensor-id");
      const entry  = SENSOR_MAP.find((s) => s.domSensorId === domId);
      const name   = entry ? entry.name : `Sensor ${domId}`;
      const isOff  = sensor.classList.contains("offline-sensor");
      const status = isOff ? "Disabled" : sensor.title.replace(" (Disabled)", "");
      showToast(`📡 ${name} — ${status}`);
    });
  });
}

// ── Status card click handler ─────────────────────────────────────────────────
function initStatusCardHandlers() {
  document.querySelectorAll(".status-card").forEach((card) => {
    card.addEventListener("click", () => {
      const domId = card.getAttribute("data-sensor-id");
      const entry = SENSOR_MAP.find((s) => s.domSensorId === domId);
      const name  = entry ? entry.name : `Sensor ${domId}`;
      showToast(`🔍 Opening detailed view for ${name}`);
    });
  });
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function showToast(message) {
  const existing = document.getElementById("mapToast");
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.textContent = `
    @keyframes mapToastIn {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .sensor-signal.offline-sensor { filter: grayscale(1); cursor: not-allowed; }
    .status-card.offline { opacity: 0.6; border-left: 3px solid #ef4444 !important; }
    .status-card.offline .status-icon i { color: #ef4444 !important; }
  `;
  document.head.appendChild(style);

  const toast = document.createElement("div");
  toast.id = "mapToast";
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#1e293b;color:white;padding:12px 20px;
    border-radius:10px;font-size:14px;font-weight:500;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
    animation:mapToastIn 0.3s ease;max-width:320px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
// NOTE: initNavHandlers() removed — handled by inline script in map.html
document.addEventListener("DOMContentLoaded", () => {
  initSensorClickHandlers();
  initStatusCardHandlers();
  subscribeToSensorStates();
});