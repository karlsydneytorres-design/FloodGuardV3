// ============================================================
//  js/profile.js
// ============================================================

import { auth } from "/js/firebase-config.js";
import {
    onAuthStateChanged, signOut, updateProfile,
    updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getUserProfile, updateUserProfile } from "/js/profile-utils.js";

let currentUser = null;

// ── Auth guard ──────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    document.documentElement.style.visibility = "visible";

    if (!user) {
        window.location.replace('/auth/auth.html');
        return;
    }

    currentUser = user;

    const profile = await getUserProfile(user.uid);
    const name    = profile?.displayName || user.displayName || '';
    const email   = user.email || '';
    const phone   = profile?.phone || '';
    const role    = profile?.role  || 'user';

    // Populate form
    document.getElementById('fullName').value = name;
    document.getElementById('email').value    = email;
    document.getElementById('phone').value    = phone;

    // Profile card — show first letter of first name
    const firstName   = name.split(' ')[0] || 'U';
    const avatarEl    = document.getElementById('profileAvatar');
    const displayEl   = document.getElementById('displayName');
    const roleEl      = document.getElementById('profileRole');

    if (avatarEl)  avatarEl.textContent  = firstName.charAt(0).toUpperCase();
    if (displayEl) displayEl.textContent = name || 'User';
    if (roleEl)    roleEl.textContent    = role.charAt(0).toUpperCase() + role.slice(1);
    
    // Navbar & dropdown avatars
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) navAvatar.textContent = firstName.charAt(0).toUpperCase();
    
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    if (dropdownAvatar) dropdownAvatar.textContent = firstName.charAt(0).toUpperCase();
    
    // Welcome dropdown
    const welcomeEl = document.querySelector('.dropdown-header span');
    if (welcomeEl) welcomeEl.innerHTML = `Welcome <br> ${firstName}`;
});

// ── Toggle password visibility ──────────────────────────────
window.togglePass = function (fieldId, btn) {
    const input = document.getElementById(fieldId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type       = 'text';
        icon.className   = 'fas fa-eye-slash';
    } else {
        input.type       = 'password';
        icon.className   = 'fas fa-eye';
    }
};

// ── Save Profile ────────────────────────────────────────────
window.saveProfile = async function (event) {
    event.preventDefault();
    if (!currentUser) return false;

    const confirmed = confirm('💾 Save changes to your profile?');
    if (!confirmed) return false;

    const fullName = document.getElementById('fullName').value.trim();
    const phone    = document.getElementById('phone').value.trim();

    try {
        await updateProfile(currentUser, { displayName: fullName });
        await updateUserProfile(currentUser.uid, {
            displayName: fullName,
            phone:       phone
        });

        // Update profile card
        const firstName = fullName.split(' ')[0] || 'U';
        const avatarEl  = document.getElementById('profileAvatar');
        const displayEl = document.getElementById('displayName');
        if (avatarEl)  avatarEl.textContent  = firstName.charAt(0).toUpperCase();
        if (displayEl) displayEl.textContent = fullName || 'User';

        // Update welcome dropdown
        const welcomeEl = document.querySelector('.dropdown-header span');
        if (welcomeEl) welcomeEl.innerHTML = `Welcome <br> ${firstName}`;

        showSuccess('✅ Profile updated successfully!');

    } catch (error) {
        console.error('Save profile error:', error);
        showSuccess('❌ Failed to update profile. Please try again.');
    }

    return false;
};

// ── Change Password ─────────────────────────────────────────
window.changePassword = async function () {
    if (!currentUser) return;

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword) {
        alert('⚠️ Please enter your current password and a new password.');
        return;
    }
    if (newPassword !== confirmPassword) {
        alert('⚠️ New passwords do not match.');
        return;
    }
    if (newPassword.length < 6) {
        alert('⚠️ New password must be at least 6 characters.');
        return;
    }

    const confirmed = confirm('🔒 Are you sure you want to change your password?');
    if (!confirmed) return;

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);

        alert('✅ Password updated successfully!');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value     = '';
        document.getElementById('confirmPassword').value = '';

    } catch (error) {
        console.error('Change password error:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('❌ Current password is incorrect.');
        } else {
            alert('❌ Failed to update password. Please try again.');
        }
    }
};

// ── Logout ──────────────────────────────────────────────────
window.logout = async function () {
    const confirmed = confirm('👋 Are you sure you want to logout from FloodGuard?');
    if (!confirmed) return;

    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity    = '0';
    try {
        await signOut(auth);
        window.location.replace('/auth/auth.html');
    } catch (err) {
        console.error('Logout error:', err);
        window.location.replace('/auth/auth.html');
    }
};

// ── Reset Form ──────────────────────────────────────────────
window.resetForm = function () {
    const confirmed = confirm('🔄 Are you sure you want to reset all changes?');
    if (!confirmed) return;

    if (currentUser) {
        document.getElementById('fullName').value = currentUser.displayName || '';
        document.getElementById('phone').value    = '';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value     = '';
        document.getElementById('confirmPassword').value = '';
    }
};

// ── Helpers ─────────────────────────────────────────────────
function showSuccess(message) {
    const el = document.getElementById('successMessage');
    if (!el) return;
    el.textContent   = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ── Dropdown ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const profileDropdown = document.querySelector('.profile-dropdown-container');
    const dropdownMenu    = document.querySelector('.profile-dropdown-menu');

    if (profileDropdown && dropdownMenu) {
        profileDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
    }

    // Password strength indicator
    const newPasswordField     = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    if (newPasswordField) {
        newPasswordField.addEventListener('input', function () {
            this.style.borderColor = this.value.length > 0 && this.value.length < 6
                ? '#ef4444' : this.value.length >= 6 ? '#10b981' : '';
        });
    }
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function () {
            const newPass = document.getElementById('newPassword')?.value || '';
            this.style.borderColor = this.value && newPass !== this.value
                ? '#ef4444' : this.value && newPass === this.value ? '#10b981' : '#e5e7eb';
        });
    }
});