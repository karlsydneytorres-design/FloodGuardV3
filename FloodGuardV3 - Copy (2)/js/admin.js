// ============================================================
//  js/admin.js  — Full admin panel with live Firestore sync
// ============================================================

import {
  collection, doc, updateDoc, deleteDoc,
  query, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { auth, db } from "/js/firebase-config.js";
import { getUserProfile } from "/js/profile-utils.js";

// ─── Track the active Firestore listener so we can kill it ───
let unsubscribeSnapshot = null;
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
  const tbody       = document.getElementById("users-tbody");
  if (!tbody) return;

  const liveIndicator = document.getElementById("live-indicator");
  const searchInput   = document.getElementById("search-input");
  const roleFilter    = document.getElementById("role-filter");

  let allUsers  = [];
  let firstLoad = true;

  // Kill any existing listener before starting a new one
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

// ─── Main ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".hamburger")?.addEventListener("click", () => {
    document.getElementById("navMenu")?.classList.toggle("active");
  });

  const profileToggle = document.querySelector(".profile-link-toggle");
  const dropdownMenu  = document.querySelector(".profile-dropdown-menu");
  if (profileToggle && dropdownMenu) {
    profileToggle.addEventListener("click", (e) => {
      e.preventDefault();
      dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", (e) => {
      if (!profileToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = "none";
      }
    });
  }

  // ── Use onAuthStateChanged directly — NOT requireAuth ────────
  // requireAuth re-fires on every auth state change, spawning
  // multiple listeners. onAuthStateChanged with the guard below
  // ensures the panel initializes exactly once.
  onAuthStateChanged(auth, async (user) => {
    // Not logged in → redirect
    if (!user) {
      window.location.href = "/auth/auth.html";
      return;
    }

    // Already initialized → do nothing
    if (adminInitialized) return;
    adminInitialized = true;

    // Check role
    const profile = await getUserProfile(user.uid);
    if (profile?.role !== "admin") {
      showAccessDenied();
      return;
    }

    // ── Safe to initialize the panel now ─────────────────────
    const nameEl = document.getElementById("userDisplayName");
    if (nameEl) nameEl.innerHTML = `Welcome<br><strong>${profile.displayName ?? user.email}</strong>`;

    const adminLink = document.getElementById("admin-dashboard-link");
    if (adminLink) adminLink.style.display = "flex";

    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      // Unsubscribe Firestore listener before logging out
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      const { logOut } = await import("/js/auth.js");
      logOut();
    });

    initUsersTable(user);

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
});