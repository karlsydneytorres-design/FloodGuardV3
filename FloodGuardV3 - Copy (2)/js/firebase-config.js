// ============================================================
//  js/firebase-config.js
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC5sK3CUk6Fk79Pjna86zr0xuEA0OcPJa4",
  authDomain:        "flood-monitoring-c2af1.firebaseapp.com",
  databaseURL:       "https://flood-monitoring-c2af1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "flood-monitoring-c2af1",
  storageBucket:     "flood-monitoring-c2af1.firebasestorage.app",
  messagingSenderId: "161269696406",
  appId:             "1:161269696406:web:586942ca50ea2267a9bfb7",
  measurementId:     "G-M0C7E0BQMQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export service instances — import these in your other JS files
export const auth = getAuth(app);
export const db   = getFirestore(app);   // Firestore
export const rtdb = getDatabase(app);    // Realtime Database