// ============================================================
//  js/profile-utils.js  — shared utility, safe to import anywhere
// ============================================================

import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { db } from "/js/firebase-config.js";

export async function getUserProfile(uid) {
  const docSnap = await getDoc(doc(db, "users", uid));
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}