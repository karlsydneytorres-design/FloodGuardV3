// ============================================================
//  js/admin.js  — Full admin panel with live Firestore sync
// ============================================================

import {
  collection, doc, updateDoc, deleteDoc, setDoc,
  query, orderBy, onSnapshot, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { getUserProfile } from "/js/profile-utils.js";

// ─── Track the active Firestore listeners so we can kill them ─
let unsubscribeSnapshot = null;
let unsubscribeFeedback = null;
let adminInitialized    = false;

// ─── Toast ───────────────────────────────────────────────────
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✕" : "⚠"}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}

// ─── Access denied screen ────────────────────────────────────
function showAccessDenied() {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:100vh;font-family:sans-serif;background:#f4f7f6;gap:1rem;">
      <div style="font-size:4rem;">🚫</div>
      <h2 style="color:#dc2626;margin:0;">Access Denied</h2>
      <p style="color:#6b7280;">You don't have admin privileges.</p>
      <a href="/index.html"
         style="padding:10px 24px;background:#1e3a8a;color:white;border-radius:8px;text-decoration:none;">
        Go Home
      </a>
    </div>`;
}

// ─── Firestore helpers ────────────────────────────────────────
async function setUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role });
}

async function deleteUserRecord(uid) {
  await deleteDoc(doc(db, "users", uid));
}

async function getAllSensorConfigs() {
  const snapshot = await getDocs(collection(db, "sensorConfigs"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Build row HTML ───────────────────────────────────────────
function buildRow(u, currentUserUid) {
  const isSelf = u.id === currentUserUid;
  const joined = u.createdAt?.toDate?.().toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric"
  }) ?? "—";
  const roleBadgeClass = u.role === "admin" ? "badge-admin" : "badge-user";

  return `
    <tr data-uid="${u.id}">
      <td>
        <div class="user-cell">
          <div class="user-avatar">${(u.displayName || u.email || "?")[0].toUpperCase()}</div>
          <span>${u.displayName ?? "—"}</span>
          ${isSelf ? '<span class="self-badge">You</span>' : ""}
        </div>
      </td>
      <td>${u.email ?? "—"}</td>
      <td><span class="role-badge ${roleBadgeClass}">${u.role ?? "user"}</span></td>
      <td>
        <select class="role-select" data-uid="${u.id}" ${isSelf ? "disabled title='Cannot change your own role'" : ""}>
          <option value="user"      ${u.role === "user"      ? "selected" : ""}>User</option>
          <option value="admin"     ${u.role === "admin"     ? "selected" : ""}>Admin</option>
          <option value="moderator" ${u.role === "moderator" ? "selected" : ""}>Moderator</option>
        </select>
      </td>
      <td>${joined}</td>
      <td>
        <button class="btn-delete" data-uid="${u.id}" data-name="${u.displayName ?? u.email}"
                ${isSelf ? "disabled title='Cannot delete your own account'" : ""}>
          <span>🗑</span> Delete
        </button>
      </td>
    </tr>`;
}

// ─── Attach row listeners ─────────────────────────────────────
function attachListeners(tbody, currentUserUid) {
  tbody.querySelectorAll(".role-select").forEach(select => {
    select.addEventListener("change", async () => {
      const uid  = select.dataset.uid;
      const role = select.value;
      const row  = select.closest("tr");
      select.disabled = true;
      try {
        await setUserRole(uid, role);
        const badge = row.querySelector(".role-badge");
        if (badge) {
          badge.className = `role-badge ${role === "admin" ? "badge-admin" : "badge-user"}`;
          badge.textContent = role;
        }
        showToast(`Role updated to "${role}" successfully.`);
      } catch (err) {
        showToast("Failed to update role.", "error");
      } finally {
        if (uid !== currentUserUid) select.disabled = false;
      }
    });
  });

  tbody.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid  = btn.dataset.uid;
      const name = btn.dataset.name;
      if (!confirm(`Remove "${name}" from Firestore?\n\nThis only deletes their database record, not their authentication account.`)) return;
      btn.disabled = true;
      btn.innerHTML = "<span>⏳</span> Deleting…";
      try {
        await deleteUserRecord(uid);
        showToast(`User "${name}" deleted successfully.`);
      } catch (err) {
        showToast("Failed to delete user.", "error");
        btn.disabled = false;
        btn.innerHTML = "<span>🗑</span> Delete";
      }
    });
  });
}

// ─── Stats ───────────────────────────────────────────────────
function updateStats(users) {
  const total   = users.length;
  const admins  = users.filter(u => u.role === "admin").length;
  const mods    = users.filter(u => u.role === "moderator").length;
  const regular = total - admins - mods;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("stat-total",  total);
  set("stat-admins", admins);
  set("stat-mods",   mods);
  set("stat-users",  regular);
}

// ─── DOM diff ─────────────────────────────────────────────────
function diffTable(tbody, newRows, currentUserUid) {
  const existingRows = new Map();
  tbody.querySelectorAll("tr[data-uid]").forEach(tr => existingRows.set(tr.dataset.uid, tr));

  const newUids = new Set(newRows.map(u => u.id));
  existingRows.forEach((tr, uid) => { if (!newUids.has(uid)) tr.remove(); });

  newRows.forEach((u, i) => {
    const dummy = document.createElement("tbody");
    dummy.innerHTML = buildRow(u, currentUserUid);
    const newTr    = dummy.firstElementChild;
    const existing = existingRows.get(u.id);

    if (!existing) {
      const allRows = tbody.querySelectorAll("tr[data-uid]");
      allRows[i] ? tbody.insertBefore(newTr, allRows[i]) : tbody.appendChild(newTr);
      attachListeners(tbody, currentUserUid);
    } else if (existing.innerHTML !== newTr.innerHTML) {
      existing.replaceWith(newTr);
      attachListeners(tbody, currentUserUid);
    }
  });
}

// ─── Start the live users table ───────────────────────────────
function initUsersTable(currentUser) {
  const tbody = document.getElementById("users-tbody");
  if (!tbody) return;

  const liveIndicator = document.getElementById("live-indicator");
  const searchInput   = document.getElementById("search-input");
  const roleFilter    = document.getElementById("role-filter");

  let allUsers  = [];
  let firstLoad = true;

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  const q = query(collection(db, "users"));

  unsubscribeSnapshot = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
    allUsers = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

    renderTable(firstLoad);
    firstLoad = false;

    if (liveIndicator) {
      liveIndicator.classList.add("pulse");
      setTimeout(() => liveIndicator.classList.remove("pulse"), 1000);
    }
  }, (err) => {
    console.error("Firestore listener error:", err);
    showToast("Lost connection to database.", "error");
    if (liveIndicator) liveIndicator.style.background = "#ef4444";
  });

  function renderTable(fullRender = false) {
    const search   = searchInput?.value.toLowerCase() ?? "";
    const role     = roleFilter?.value ?? "all";
    const filtered = allUsers.filter(u => {
      const matchSearch = !search
        || (u.displayName ?? "").toLowerCase().includes(search)
        || (u.email       ?? "").toLowerCase().includes(search);
      const matchRole = role === "all" || u.role === role;
      return matchSearch && matchRole;
    });

    updateStats(allUsers);

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row">
        ${search || role !== "all" ? "No users match your filter." : "No users found."}
      </td></tr>`;
      return;
    }

    if (fullRender) {
      tbody.innerHTML = filtered.map(u => buildRow(u, currentUser.uid)).join("");
      attachListeners(tbody, currentUser.uid);
    } else {
      diffTable(tbody, filtered, currentUser.uid);
    }
  }

  searchInput?.addEventListener("input",  () => renderTable());
  roleFilter?.addEventListener("change",  () => renderTable());
}

// ─── Feedback table ───────────────────────────────────────────
function initFeedbackTable() {
  const tbody = document.getElementById("feedback-tbody");
  if (!tbody) return;

  const searchInput   = document.getElementById("feedback-search");
  const ratingFilter  = document.getElementById("feedback-rating-filter");
  const liveIndicator = document.getElementById("feedback-live-indicator");

  let allFeedback = [];

  const stars = (n) => "⭐".repeat(n) + "✩".repeat(5 - n);

  const easeLabels = {
    "very-easy"     : "Very Easy",
    "easy"          : "Easy",
    "neutral"       : "Neutral",
    "difficult"     : "Difficult",
    "very-difficult": "Very Difficult"
  };

  function buildFeedbackRow(f) {
    const submitted = f.submittedAt?.toDate?.().toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    }) ?? "—";

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar">
              ${(f.displayName || f.userEmail || "?")[0].toUpperCase()}
            </div>
            <span>${f.displayName ?? "—"}</span>
          </div>
        </td>
        <td>${f.userEmail ?? "—"}</td>
        <td style="white-space:nowrap;">
          ${stars(f.rating ?? 0)} <strong>${f.rating ?? 0}</strong>
        </td>
        <td>${easeLabels[f.easeOfUse] ?? f.easeOfUse ?? "—"}</td>
        <td>${f.mostUsefulFeature || "—"}</td>
        <td style="max-width:220px;white-space:pre-wrap;word-break:break-word;">
          ${f.improvements || "—"}
        </td>
        <td>${f.contactEmail || "—"}</td>
        <td style="white-space:nowrap;">${submitted}</td>
      </tr>`;
  }

  function updateFeedbackStats(data) {
    const total = data.length;
    const avg   = total
      ? (data.reduce((s, f) => s + (f.rating ?? 0), 0) / total).toFixed(1)
      : "—";
    const five = data.filter(f => f.rating === 5).length;
    const one  = data.filter(f => f.rating === 1).length;
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("stat-feedback-total", total);
    set("stat-feedback-avg",   avg);
    set("stat-feedback-five",  five);
    set("stat-feedback-one",   one);
  }

  function renderFeedback() {
    const search = searchInput?.value.toLowerCase() ?? "";
    const rating = ratingFilter?.value ?? "all";

    const filtered = allFeedback.filter(f => {
      const matchSearch = !search
        || (f.displayName       ?? "").toLowerCase().includes(search)
        || (f.userEmail         ?? "").toLowerCase().includes(search)
        || (f.improvements      ?? "").toLowerCase().includes(search)
        || (f.mostUsefulFeature ?? "").toLowerCase().includes(search);
      const matchRating = rating === "all" || String(f.rating) === rating;
      return matchSearch && matchRating;
    });

    updateFeedbackStats(allFeedback);

    tbody.innerHTML = filtered.length
      ? filtered.map(buildFeedbackRow).join("")
      : `<tr><td colspan="8" class="empty-row">No feedback found.</td></tr>`;
  }

  if (unsubscribeFeedback) {
    unsubscribeFeedback();
    unsubscribeFeedback = null;
  }

  const q = query(collection(db, "feedbacks"), orderBy("submittedAt", "desc"));

  unsubscribeFeedback = onSnapshot(q, (snapshot) => {
    allFeedback = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFeedback();

    if (liveIndicator) {
      liveIndicator.style.transform = "scale(1.8)";
      setTimeout(() => liveIndicator.style.transform = "scale(1)", 600);
    }
  }, (err) => {
    console.error("Feedback listener error:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Failed to load feedback.</td></tr>`;
  });

  searchInput?.addEventListener("input",   renderFeedback);
  ratingFilter?.addEventListener("change", renderFeedback);
}

// ─── Main ─────────────────────────────────────────────────────
const profileToggle = document.querySelector(".profile-link-toggle");
const dropdownMenu  = document.querySelector(".profile-dropdown-menu");

if (profileToggle && dropdownMenu) {
  profileToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdownMenu.classList.contains("show");
    dropdownMenu.classList.toggle("show", !isOpen);
    // Also support inline display for admin.html which doesn't use .show
    dropdownMenu.style.display = isOpen ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!profileToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove("show");
      dropdownMenu.style.display = "none";
    }
  });

  // Prevent clicks inside the dropdown from closing it
  dropdownMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// ─── Sensor Toggles Table ─────────────────────────────────────
function initSensorTogglesTable() {
  const tbody = document.getElementById("sensor-toggles-tbody");
  if (!tbody) return;

  const BARANGAYS = [
    {
      id: "sulipan", name: "Barangay Sulipan",
      sensors: [
        { id: "WLM-001", type: "Water Level & Rainfall" }
      ]
    },
    {
      id: "paligui", name: "Barangay Paligui",
      sensors: [
        { id: "WLM-002", type: "Water Level & Rainfall" }
      ]
    },
    {
      id: "san_vicente", name: "Barangay San Vicente",
      sensors: [
        { id: "WLM-003", type: "Water Level & Rainfall" }
      ]
    }
  ];

  // Subscribe to all 9 sensor_toggles docs in real time
  const docRefs = [];
  for (const brgy of BARANGAYS) {
    for (const sensor of brgy.sensors) {
      docRefs.push({ brgy, sensor, key: `${brgy.id}_${sensor.id}` });
    }
  }

  const toggleStates = {};

  function renderSensorTable() {
    let enabledCount = 0;
    let html = "";

    for (const brgy of BARANGAYS) {
      const rowspan = brgy.sensors.length;
      brgy.sensors.forEach((sensor, idx) => {
        const key     = `${brgy.id}_${sensor.id}`;
        const state   = toggleStates[key] ?? {};
        const enabled = state.enabled ?? false;
        if (enabled) enabledCount++;

        const updatedAt = state.updatedAt?.toDate?.().toLocaleString("en-US", {
          month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit"
        }) ?? "—";

        html += `
          <tr style="border-bottom:1px solid #f3f4f6;">
            ${idx === 0 ? `
            <td rowspan="${rowspan}" style="padding:14px 16px;vertical-align:top;
                border-right:1px solid #f3f4f6;font-weight:600;color:#1e3a8a;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:18px;">🏘️</span>
                <span>${brgy.name}</span>
              </div>
            </td>` : ""}
            <td style="padding:14px 16px;font-family:monospace;font-size:13px;">${sensor.id}</td>
            <td style="padding:14px 16px;font-size:13px;color:#374151;">${sensor.type}</td>
            <td style="padding:14px 16px;">
              <span style="
                display:inline-flex;align-items:center;gap:6px;
                background:#fee2e2;color:#991b1b;
                padding:3px 10px;border-radius:20px;
                font-size:12px;font-weight:600;
              ">
                <span style="width:7px;height:7px;border-radius:50%;
                  background:#ef4444;display:inline-block;"></span>
                OFFLINE
              </span>
            </td>
            <td style="padding:14px 16px;">
              <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                <div style="position:relative;width:44px;height:24px;">
                  <input type="checkbox" ${enabled ? "checked" : ""}
                    style="opacity:0;width:0;height:0;position:absolute;"
                    onchange="adminToggleSensor('${brgy.id}','${sensor.id}',this.checked)">
                  <div style="
                    position:absolute;inset:0;border-radius:24px;
                    background:${enabled ? "#2563eb" : "#d1d5db"};
                    transition:background 0.3s;
                  "></div>
                  <div style="
                    position:absolute;top:3px;
                    left:${enabled ? "23px" : "3px"};
                    width:18px;height:18px;border-radius:50%;
                    background:white;transition:left 0.3s;
                    box-shadow:0 1px 3px rgba(0,0,0,0.2);
                  "></div>
                </div>
                <span style="font-size:13px;color:${enabled ? "#2563eb" : "#9ca3af"};">
                  ${enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </td>
            <td style="padding:14px 16px;font-size:12px;color:#9ca3af;">${updatedAt}</td>
          </tr>`;
      });
    }

    tbody.innerHTML = html;

    const el = document.getElementById("stat-sensor-enabled");
    if (el) el.textContent = enabledCount;
  }

  // Subscribe to each doc
  for (const { key, brgy, sensor } of docRefs) {
    const ref = doc(db, "sensor_toggles", key);
    onSnapshot(ref, snap => {
      toggleStates[key] = snap.exists() ? snap.data() : { enabled: false };
      renderSensorTable();

      // pulse the live indicator
      const ind = document.getElementById("sensor-live-indicator");
      if (ind) {
        ind.style.transform = "scale(1.8)";
        setTimeout(() => ind.style.transform = "scale(1)", 400);
      }
    });
  }
}

// Admin toggle handler — called from inline onchange
window.adminToggleSensor = async function(barangayId, sensorId, enabled) {
  try {
    await setDoc(
      doc(db, "sensor_toggles", `${barangayId}_${sensorId}`),
      { enabled, barangayId, sensorId, updatedAt: serverTimestamp() },
      { merge: true }
    );
    showToast(`${sensorId} ${enabled ? "enabled" : "disabled"} successfully.`);
  } catch (err) {
    console.error(err);
    showToast("Failed to update sensor toggle.", "error");
  }
};

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/auth/auth.html";
      return;
    }

    if (adminInitialized) return;
    adminInitialized = true;

    const profile = await getUserProfile(user.uid);
    if (profile?.role !== "admin") {
      showAccessDenied();
      return;
    }

    const nameEl = document.getElementById("userDisplayName");
    if (nameEl) nameEl.innerHTML = `Welcome<br><strong>${profile.displayName ?? user.email}</strong>`;

    const adminLink = document.getElementById("admin-dashboard-link");
    if (adminLink) adminLink.style.display = "flex";

    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeFeedback) unsubscribeFeedback();
      const { logOut } = await import("/js/auth.js");
      logOut();
    });

    initUsersTable(user);
    initFeedbackTable();
    initSensorTogglesTable();

    const sensorList = document.getElementById("sensor-configs-list");
    if (sensorList) {
      try {
        const configs = await getAllSensorConfigs();
        sensorList.innerHTML = configs.map(s => `
          <div class="sensor-config-card">
            <strong>${s.id}</strong>
            <span>📍 ${s.location ?? "N/A"}</span>
            <span>🚨 Threshold: ${s.alertThreshold ?? "N/A"} cm</span>
          </div>
        `).join("") || "<p>No sensor configs found.</p>";
      } catch (err) {
        sensorList.innerHTML = "<p>Failed to load sensor configs.</p>";
      }
    }
  });