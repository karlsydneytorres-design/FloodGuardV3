// ============================================================
//  js/admin.js
// ============================================================

import {
    collection, getDocs, doc, updateDoc,
    deleteDoc, query, orderBy
  } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
  
  import { db } from "/js/firebase-config.js";
  import { requireAuth } from "/js/auth.js";
  import { getUserProfile } from "/js/profile.js";
  
  async function requireAdmin(callback) {
    requireAuth(async (user) => {
      const profile = await getUserProfile(user.uid);
      if (profile?.role !== "admin") {
        document.body.innerHTML = `
          <div style="text-align:center;padding:4rem;font-family:sans-serif;">
            <h2>Access Denied</h2>
            <p>You don't have admin privileges.</p>
            <a href="/index.html">Go Home</a>
          </div>`;
        return;
      }
      callback(user, profile);
    });
  }
  
  export async function getAllUsers() {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  
  export async function setUserRole(uid, role) {
    await updateDoc(doc(db, "users", uid), { role });
  }
  
  export async function deleteUserRecord(uid) {
    await deleteDoc(doc(db, "users", uid));
  }
  
  export async function getAllSensorConfigs() {
    const snapshot = await getDocs(collection(db, "sensorConfigs"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    requireAdmin(async (user, profile) => {
      console.log("Admin panel — logged in as:", user.email);
  
      const usersTableBody = document.getElementById("users-tbody");
      if (usersTableBody) {
        const users = await getAllUsers();
        usersTableBody.innerHTML = users.map(u => `
          <tr data-uid="${u.id}">
            <td>${u.displayName ?? "—"}</td>
            <td>${u.email}</td>
            <td>
              <select class="role-select" data-uid="${u.id}">
                <option value="user"  ${u.role === "user"  ? "selected" : ""}>User</option>
                <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
            </td>
            <td>${u.createdAt?.toDate?.().toLocaleDateString() ?? "—"}</td>
            <td>
              <button class="btn-delete" data-uid="${u.id}">Delete</button>
            </td>
          </tr>
        `).join("");
  
        usersTableBody.querySelectorAll(".role-select").forEach(select => {
          select.addEventListener("change", async () => {
            await setUserRole(select.dataset.uid, select.value);
          });
        });
  
        usersTableBody.querySelectorAll(".btn-delete").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (confirm("Remove this user's record from Firestore?")) {
              await deleteUserRecord(btn.dataset.uid);
              btn.closest("tr").remove();
            }
          });
        });
      }
  
      const sensorList = document.getElementById("sensor-configs-list");
      if (sensorList) {
        const configs = await getAllSensorConfigs();
        sensorList.innerHTML = configs.map(s => `
          <div class="sensor-config-card">
            <strong>${s.id}</strong>
            <span>Location: ${s.location ?? "N/A"}</span>
            <span>Alert threshold: ${s.alertThreshold ?? "N/A"} cm</span>
          </div>
        `).join("") || "<p>No sensor configs found.</p>";
      }
    });
  });