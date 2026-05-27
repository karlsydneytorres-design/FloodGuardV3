// ============================================================
//  scripts/map.js
//  Firestore-backed sensor state for the Map & Preparedness page
//  Mirrors the same sensor_toggles collection used in monitoring.js
// ============================================================

import { db } from "./firebase-config.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Must match the BARANGAYS sensor IDs in monitoring.js exactly
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
  const signal  = document.querySelector(`.sensor-signal[data-sensor-id="${domSensorId}"]`);
  const card    = document.querySelector(`.status-card[data-sensor-id="${domSensorId}"]`);

  if (signal) {
    if (enabled) {
      // Keep existing status class (active / warning / critical) set in HTML
      signal.classList.remove("offline-sensor");
      signal.style.opacity = "1";
      signal.title = signal.title.replace(" (Disabled)", "");
    } else {
      signal.classList.add("offline-sensor");
      signal.style.opacity = "0.35";
      if (!signal.title.includes("(Disabled)")) {
        signal.title += " (Disabled)";
      }
    }
  }

  if (card) {
    const icon     = card.querySelector(".status-icon i");
    const subtitle = card.querySelector(".status-subtitle");

    if (enabled) {
      card.classList.remove("offline");
      if (icon) {
        // Restore icon based on card's original status class
        if (card.classList.contains("warning")) {
          icon.className = "fas fa-exclamation-triangle";
        } else {
          icon.className = "fas fa-check-circle";
        }
      }
      // Restore original subtitle text stored in data attribute
      if (subtitle && card.dataset.originalSubtitle) {
        subtitle.textContent = card.dataset.originalSubtitle;
      }
    } else {
      // Save original subtitle before overwriting
      if (subtitle && !card.dataset.originalSubtitle) {
        card.dataset.originalSubtitle = subtitle.textContent;
      }
      card.classList.add("offline");
      if (icon) icon.className = "fas fa-times-circle";
      if (subtitle) subtitle.textContent = "Sensor Disabled";
    }
  }
}

// ── Subscribe to all sensor toggles in real-time ─────────────────────────────
function subscribeToSensorStates() {
  SENSOR_MAP.forEach(({ barangayId, sensorId, domSensorId }) => {
    onSnapshot(sensorDocRef(barangayId, sensorId), (snap) => {
      // Default: if doc doesn't exist yet, treat as disabled
      const enabled = snap.exists() ? (snap.data().enabled ?? false) : false;
      applySensorState(domSensorId, enabled);
    });
  });
}

// ── Sensor click popup ────────────────────────────────────────────────────────
function initSensorClickHandlers() {
  const signals = document.querySelectorAll(".sensor-signal");
  signals.forEach((sensor) => {
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
  const cards = document.querySelectorAll(".status-card");
  cards.forEach((card) => {
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
  // Remove existing toast if any
  const existing = document.getElementById("mapToast");
  if (existing) existing.remove();

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

  const style = document.createElement("style");
  style.textContent = `
    @keyframes mapToastIn {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .sensor-signal.offline-sensor {
      filter: grayscale(1);
      cursor: not-allowed;
    }
    .status-card.offline {
      opacity: 0.6;
      border-left: 3px solid #ef4444 !important;
    }
    .status-card.offline .status-icon i {
      color: #ef4444 !important;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ── Profile dropdown & hamburger menu ────────────────────────────────────────
function initNavHandlers() {
  const profileToggle = document.querySelector(".profile-link-toggle");
  const dropdownMenu  = document.querySelector(".profile-dropdown-menu");
  const chevron       = document.querySelector(".profile-chevron");

  if (profileToggle && dropdownMenu) {
    profileToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
      if (chevron) chevron.classList.toggle("rotate");
    });

    dropdownMenu.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", () => {
      dropdownMenu.classList.remove("show");
      if (chevron) chevron.classList.remove("rotate");
    });
  }
}

window.toggleMenu = function () {
  const navMenu = document.getElementById("navMenu");
  if (navMenu) navMenu.classList.toggle("active");
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNavHandlers();
  initSensorClickHandlers();
  initStatusCardHandlers();
  subscribeToSensorStates();   // live Firestore sync — same DB as monitoring.js
});
