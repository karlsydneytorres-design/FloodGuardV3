// ============================================================
//  scripts/monitoring.js
//  Firestore-backed sensor dashboard
//  All sensors are OFFLINE (hardware not yet deployed)
// ============================================================

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const BARANGAYS = [
    {
      id:       "sulipan",
      name:     "Barangay Sulipan",
      location: "Apalit, Pampanga",
      sensors: [
        { id: "WLM-001", type: "Water Level & Rainfall", icon: "💧" }
      ]
    },
    {
      id:       "paligui",
      name:     "Barangay Paligui",
      location: "Apalit, Pampanga",
      sensors: [
        { id: "WLM-002", type: "Water Level & Rainfall", icon: "💧" }
      ]
    },
    {
      id:       "san_vicente",
      name:     "Barangay San Vicente",
      location: "Apalit, Pampanga",
      sensors: [
        { id: "WLM-003", type: "Water Level & Rainfall", icon: "💧" }
      ]
    }
  ];

// In-memory toggle state (loaded from Firestore)
const sensorStates = {};  // key: "barangayId_sensorId" → { enabled: bool }

// ── Firestore helpers ─────────────────────────────────────────────────────────

// Returns Firestore doc ref for a sensor's toggle state
function sensorDocRef(barangayId, sensorId) {
  return doc(db, "sensor_toggles", `${barangayId}_${sensorId}`);
}

// Load all toggle states from Firestore, then render
async function loadSensorStates() {
  const promises = [];
  for (const brgy of BARANGAYS) {
    for (const sensor of brgy.sensors) {
      const key = `${brgy.id}_${sensor.id}`;
      promises.push(
        getDoc(sensorDocRef(brgy.id, sensor.id)).then(snap => {
          // Default to disabled if doc doesn't exist yet
          sensorStates[key] = snap.exists() ? snap.data() : { enabled: false };
        })
      );
    }
  }
  await Promise.all(promises);
}

// Save toggle state to Firestore
async function saveSensorState(barangayId, sensorId, enabled) {
  const key = `${barangayId}_${sensorId}`;
  sensorStates[key] = { enabled };
  try {
    await setDoc(sensorDocRef(barangayId, sensorId), {
      enabled,
      barangayId,
      sensorId,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to save sensor state:", err);
  }
}

// Subscribe to real-time toggle updates so multiple admin tabs stay in sync
function subscribeToToggleUpdates() {
  for (const brgy of BARANGAYS) {
    for (const sensor of brgy.sensors) {
      const key = `${brgy.id}_${sensor.id}`;
      onSnapshot(sensorDocRef(brgy.id, sensor.id), snap => {
        if (snap.exists()) {
          sensorStates[key] = snap.data();
          // Update the toggle UI if it exists
          const toggle = document.getElementById(`toggle_${key}`);
          if (toggle) toggle.checked = snap.data().enabled;
          // Re-render the status badge
          const badge = document.getElementById(`status_${key}`);
          if (badge) renderStatusBadge(badge, false); // hardware always offline
        }
      });
    }
  }
}

// ── DOM Builders ──────────────────────────────────────────────────────────────

function renderStatusBadge(el, _hardwareOnline) {
  // Sensors are always offline — hardware not deployed
  el.innerHTML = `
    <span class="sensor-status offline" style="
      display:inline-flex; align-items:center; gap:6px;
      background:#fee2e2; color:#991b1b;
      padding:3px 10px; border-radius:20px;
      font-size:12px; font-weight:600; letter-spacing:0.5px;
    ">
      <span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;"></span>
      OFFLINE
    </span>`;
}

function buildSensorTable() {
  const container = document.getElementById("sensorTableContainer");
  if (!container) return;

  let html = `
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f1f5f9;text-align:left;">
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;">Barangay</th>
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;">Sensor ID</th>
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;">Type</th>
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;">Status</th>
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;">Water Level</th>
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;">Rainfall</th>
          <th style="padding:12px 16px;font-weight:600;color:#1e40af;border-bottom:2px solid #e2e8f0;text-align:center;">Enable / Disable</th>
        </tr>
      </thead>
      <tbody>`;

  for (const brgy of BARANGAYS) {
    const rowspan = brgy.sensors.length;
    brgy.sensors.forEach((sensor, idx) => {
      const key = `${brgy.id}_${sensor.id}`;
      const checked = sensorStates[key]?.enabled ? "checked" : "";
      html += `
        <tr style="border-bottom:1px solid #e2e8f0;transition:background 0.2s;" 
            onmouseover="this.style.background='#f8fafc'" 
            onmouseout="this.style.background='white'">
          ${idx === 0 ? `<td rowspan="${rowspan}" style="padding:12px 16px;font-weight:600;color:#1e3a8a;vertical-align:top;border-right:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;">🏘️</span>
              <div>
                <div>${brgy.name}</div>
                <div style="font-size:12px;color:#6b7280;font-weight:400;">${brgy.location}</div>
              </div>
            </div>
          </td>` : ""}
          <td style="padding:12px 16px;font-family:monospace;color:#374151;">${sensor.icon} ${sensor.id}</td>
          <td style="padding:12px 16px;color:#374151;">${sensor.type}</td>
          <td style="padding:12px 16px;" id="status_${key}"></td>
          <td style="padding:12px 16px;color:#9ca3af;font-style:italic;">— N/A (offline)</td>
          <td style="padding:12px 16px;color:#9ca3af;font-style:italic;">— N/A (offline)</td>
          <td style="padding:12px 16px;text-align:center;">
            <label class="toggle-switch" style="position:relative;display:inline-block;width:48px;height:26px;cursor:pointer;" title="Toggle sensor monitoring">
              <input type="checkbox" id="toggle_${key}" ${checked}
                style="opacity:0;width:0;height:0;position:absolute;"
                onchange="handleToggle('${brgy.id}', '${sensor.id}', this.checked)">
              <span class="toggle-slider" style="
                position:absolute;top:0;left:0;right:0;bottom:0;
                background:${checked ? "#2563eb" : "#cbd5e1"};
                border-radius:26px;transition:background 0.3s;
              "></span>
              <span style="
                position:absolute;top:3px;left:${checked ? "25px" : "3px"};
                width:20px;height:20px;border-radius:50%;background:white;
                transition:left 0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.2);
              " id="knob_${key}"></span>
            </label>
          </td>
        </tr>`;
    });
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;

  // Render all status badges
  for (const brgy of BARANGAYS) {
    for (const sensor of brgy.sensors) {
      const key = `${brgy.id}_${sensor.id}`;
      const badge = document.getElementById(`status_${key}`);
      if (badge) renderStatusBadge(badge, false);
    }
  }
}

// ── Toggle handler (called from inline onchange) ──────────────────────────────
window.handleToggle = async function(barangayId, sensorId, enabled) {
  const key = `${barangayId}_${sensorId}`;

  // Animate slider
  const knob = document.getElementById(`knob_${key}`);
  const slider = knob?.previousElementSibling;
  if (knob) knob.style.left = enabled ? "25px" : "3px";
  if (slider) slider.style.background = enabled ? "#2563eb" : "#cbd5e1";

  await saveSensorState(barangayId, sensorId, enabled);

  // Show brief feedback toast
  showToast(
    enabled
      ? `${sensorId} monitoring enabled (awaiting hardware)`
      : `${sensorId} monitoring disabled`
  );
};

// ── Sensor panels (hero cards) ────────────────────────────────────────────────
function buildSensorPanels() {
  const container = document.getElementById("sensorsGrid");
  if (!container) return;

  let html = "";
  for (const brgy of BARANGAYS) {
    html += `
      <div style="
        background:white;border-radius:16px;padding:24px;
        border:1px solid #e2e8f0;margin-bottom:20px;
        box-shadow:0 2px 8px rgba(0,0,0,0.05);
      ">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;
                    padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:24px;">🏘️</span>
          <div>
            <h3 style="margin:0;color:#1e3a8a;font-size:17px;">${brgy.name}</h3>
            <p style="margin:0;font-size:13px;color:#6b7280;">${brgy.location}</p>
          </div>
          <span style="margin-left:auto;background:#fee2e2;color:#991b1b;
            padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">
            ALL SENSORS OFFLINE
          </span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">`;

    for (const sensor of brgy.sensors) {
      html += `
          <div style="
            background:#f8fafc;border-radius:12px;padding:18px;
            border:1px solid #e2e8f0;
          ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:22px;">${sensor.icon}</span>
                <div>
                  <div style="font-weight:600;font-size:13px;color:#1e40af;">${sensor.id}</div>
                  <div style="font-size:11px;color:#6b7280;">${sensor.type}</div>
                </div>
              </div>
            </div>
            <div style="
              background:#1e293b;border-radius:8px;padding:14px;
              text-align:center;font-family:monospace;margin-bottom:12px;
            ">
              <div style="color:#ef4444;font-size:22px;font-weight:700;letter-spacing:2px;">
                -- --
              </div>
              <div style="color:#64748b;font-size:11px;margin-top:4px;">NO SIGNAL</div>
            </div>
            <div style="display:flex;gap:8px;justify-content:center;">
              <div style="text-align:center;flex:1;">
                <div style="width:18px;height:18px;border-radius:50%;background:#374151;margin:0 auto 4px;"></div>
                <div style="font-size:10px;color:#9ca3af;">NORMAL</div>
              </div>
              <div style="text-align:center;flex:1;">
                <div style="width:18px;height:18px;border-radius:50%;background:#374151;margin:0 auto 4px;"></div>
                <div style="font-size:10px;color:#9ca3af;">WARNING</div>
              </div>
              <div style="text-align:center;flex:1;">
                <div style="width:18px;height:18px;border-radius:50%;background:#374151;margin:0 auto 4px;"></div>
                <div style="font-size:10px;color:#9ca3af;">CRITICAL</div>
              </div>
            </div>
            <div style="
              margin-top:12px;font-size:11px;color:#9ca3af;
              text-align:center;border-top:1px solid #e2e8f0;padding-top:10px;
            ">
              Waiting for hardware connection
            </div>
          </div>`;
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

// ── Analytics (offline) ───────────────────────────────────────────────────────
function buildOfflineChart() {
  const canvas = document.getElementById("waterLevelChart");
  if (!canvas) return;

  // Show offline overlay over the canvas area
  const wrapper = canvas.closest(".chart-container") || canvas.parentElement;
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:relative;background:#1e293b;border-radius:12px;
    padding:60px 20px;text-align:center;margin-top:12px;
  `;
  overlay.innerHTML = `
    <div style="color:#475569;font-size:48px;margin-bottom:16px;">📡</div>
    <div style="color:#94a3b8;font-size:18px;font-weight:600;margin-bottom:8px;">
      Analytics Offline
    </div>
    <div style="color:#64748b;font-size:14px;max-width:400px;margin:0 auto;">
      No sensor data is currently being received.<br>
      Charts will populate automatically once hardware is connected and sensors come online.
    </div>
    <div style="
      margin-top:24px;display:inline-flex;align-items:center;gap:8px;
      background:#0f172a;padding:8px 18px;border-radius:20px;
    ">
      <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;
        display:inline-block;animation:pulse 1.5s infinite;"></span>
      <span style="color:#64748b;font-size:13px;">0 / 9 sensors online</span>
    </div>
    <style>
      @keyframes pulse {
        0%,100%{opacity:1} 50%{opacity:0.3}
      }
    </style>
  `;

  // Hide canvas and insert overlay
  canvas.style.display = "none";
  const canvasParent = canvas.parentElement;
  canvasParent.style.cssText = "position:relative;";
  canvasParent.appendChild(overlay);
}

// ── Summary metric cards ──────────────────────────────────────────────────────
function buildOfflineMetrics() {
  const ids = ["waterLevel", "rainfall", "temperature", "windSpeed"];
  const labels = ["Current Water Level", "Rainfall Intensity", "Temperature", "Wind Speed"];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "—";
      el.style.color = "#9ca3af";
      el.title = `${labels[i]}: sensor offline`;
    }
  });

  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  if (statusDot) {
    statusDot.className = "status-dot";
    statusDot.style.cssText = "background:#ef4444;animation:none;";
  }
  if (statusText) {
    statusText.textContent = "All Sensors Offline — Awaiting Hardware Deployment";
    statusText.style.color = "#ef4444";
  }
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#1e293b;color:white;padding:12px 20px;
    border-radius:10px;font-size:14px;font-weight:500;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
    animation:slideIn 0.3s ease;max-width:320px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  const style = document.createElement("style");
  style.textContent = `@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`;
  document.head.appendChild(style);

  setTimeout(() => toast.remove(), 3000);
}

// ── Time display ──────────────────────────────────────────────────────────────
function updateTime() {
  const now = new Date();
  const opts = {
    timeZone: "Asia/Manila",
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  };
  const el = document.getElementById("currentTime");
  if (el) el.textContent = "Last Updated: " + now.toLocaleString("en-PH", opts);

  const lu = document.getElementById("lastUpdate");
  if (lu) lu.textContent = now.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila" });
}

 // Profile dropdown functionality
 const profileDropdown = document.querySelector('.profile-dropdown-container');
 const dropdownMenu = document.querySelector('.profile-dropdown-menu');

 if (profileDropdown && dropdownMenu) {
     profileDropdown.addEventListener('click', (event) => {
         event.stopPropagation();
         dropdownMenu.classList.toggle('show');
     });

     window.onclick = function(event) {
         if (!event.target.closest('.profile-dropdown-container')) {
             if (dropdownMenu.classList.contains('show')) {
                 dropdownMenu.classList.remove('show');
             }
         }

         const navMenu = document.getElementById('navMenu');
         if (navMenu && !event.target.closest('#navMenu') && !event.target.closest('.hamburger')) {
             navMenu.classList.remove('active');
         }
     }
 }

function initDropdown() {
  // page-specific dropdown behavior is handled by inline HTML script;
  // this fallback ensures the monitoring module does not throw.
}

function toggleMenu() {
  const navMenu = document.getElementById('navMenu');
  if (navMenu) {
    navMenu.classList.toggle('active');
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initDropdown();
  updateTime();
  setInterval(updateTime, 1000);

  // Load Firestore toggle states first, then build UI
  await loadSensorStates();

  buildSensorPanels();     // hero sensor cards per barangay
  buildSensorTable();      // management table with toggles
  buildOfflineMetrics();   // top metric cards → all offline
  buildOfflineChart();     // analytics → offline overlay

  // Subscribe to real-time Firestore updates for toggle sync
  subscribeToToggleUpdates();
});