// ============================================================
//  js/auth.js
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { doc, setDoc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { auth, db } from "/js/firebase-config.js";

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = message; el.style.display = "block"; el.style.color = "red"; }
}

function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = message; el.style.display = "block"; el.style.color = "green"; }
}

function clearError(elementId) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = ""; el.style.display = "none"; }
}

// ─── Shared role-based redirect helper ───────────────────────
async function redirectByRole(user) {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : "user";
  window.location.href = role === "admin" ? "/admin.html" : "/index.html";
}

export async function signUp(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });

    await setDoc(doc(db, "users", user.uid), {
      uid:         user.uid,
      displayName,
      email:       user.email,
      role:        "user",
      createdAt:   serverTimestamp()
    });

    await signOut(auth);
    return { success: true, user };
  } catch (error) {
    console.error("Signup error:", error.code, error.message);
    return { success: false, error: getFriendlyError(error.code) };
  }
}

export async function logIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : "user";

    return { success: true, user, role };
  } catch (error) {
    return { success: false, error: getFriendlyError(error.code) };
  }
}

export async function logOut() {
  try {
    await signOut(auth);
    window.location.href = "/auth/auth.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/auth/auth.html";
    } else {
      if (callback) callback(user);
    }
  });
}

export function redirectIfLoggedIn() {
  // visibility is already hidden from the <head> script
  onAuthStateChanged(auth, async (user) => {
    if (!user || window._isRegistering) {
      document.documentElement.style.visibility = "visible"; // show the page
      return;
    }
    try {
      await redirectByRole(user);
    } catch (err) {
      console.error("Role fetch failed:", err);
      window.location.href = "/index.html";
    }
  });
}

function getFriendlyError(code) {
  const messages = {
    "auth/email-already-in-use":   "This email is already registered.",
    "auth/invalid-email":          "Please enter a valid email address.",
    "auth/weak-password":          "Password must be at least 6 characters.",
    "auth/user-not-found":         "No account found with this email.",
    "auth/wrong-password":         "Incorrect password. Please try again.",
    "auth/invalid-credential":     "Incorrect email or password. Please try again.",
    "auth/too-many-requests":      "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return messages[code] || "Something went wrong. Please try again.";
}

document.addEventListener("DOMContentLoaded", () => {
  redirectIfLoggedIn();

  const loginForm  = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const toggleBtn  = document.getElementById("toggleBtn");
  const toggleText = document.getElementById("toggleText");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isLoginActive = loginForm.classList.contains("active");
      if (isLoginActive) {
        loginForm.classList.remove("active");
        signupForm.classList.add("active");
        toggleText.textContent = "Already have an account?";
        toggleBtn.textContent  = "Sign In";
      } else {
        signupForm.classList.remove("active");
        loginForm.classList.add("active");
        toggleText.textContent = "Don't have an account?";
        toggleBtn.textContent  = "Create Account";
      }
    });
  }

  const termsModal     = document.getElementById("termsModal");
  const acceptCheckbox = document.getElementById("acceptTerms");
  const acceptBtn      = document.getElementById("acceptTermsBtn");
  const cancelBtn      = document.getElementById("cancelTerms");

  let pendingRegistration = null;

  if (acceptCheckbox) {
    acceptCheckbox.addEventListener("change", () => {
      acceptBtn.disabled = !acceptCheckbox.checked;
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      termsModal.classList.remove("active");
      pendingRegistration = null;
      acceptCheckbox.checked = false;
      acceptBtn.disabled = true;
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", async () => {
      if (!pendingRegistration) return;
      termsModal.classList.remove("active");
      acceptCheckbox.checked = false;
      acceptBtn.disabled = true;

      const { name, email, password, btn } = pendingRegistration;
      btn.disabled = true;
      btn.textContent = "Creating account…";

      window._isRegistering = true;
      const result = await signUp(email, password, name);
      window._isRegistering = false;

      if (result.success) {
        signupForm.reset();
        showSuccess("signup-error", "✅ Account created successfully! Please sign in.");

        setTimeout(() => {
          clearError("signup-error");
          signupForm.classList.remove("active");
          loginForm.classList.add("active");
          toggleText.textContent = "Don't have an account?";
          toggleBtn.textContent  = "Create Account";

          const loginEmailInput = document.getElementById("login-email");
          if (loginEmailInput) loginEmailInput.value = email;
        }, 2000);
      } else {
        showError("signup-error", result.error);
      }

      btn.disabled = false;
      btn.textContent = "Create Account";
      pendingRegistration = null;
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError("login-error");
      const email    = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const btn      = loginForm.querySelector("button[type=submit]");
      btn.disabled   = true;
      btn.textContent = "Signing in…";

      const result = await logIn(email, password);
      if (result.success) {
        window.location.href = result.role === "admin" ? "/admin.html" : "/index.html";
      } else {
        showError("login-error", result.error);
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError("signup-error");

      const name     = document.getElementById("signup-name").value.trim();
      const email    = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const confirm  = document.getElementById("confirmPassword").value;
      const btn      = signupForm.querySelector("button[type=submit]");

      if (password !== confirm) {
        showError("signup-error", "Passwords do not match.");
        return;
      }

      if (password.length < 6) {
        showError("signup-error", "Password must be at least 6 characters.");
        return;
      }

      pendingRegistration = { name, email, password, btn };
      termsModal.classList.add("active");
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logOut);
  }
});