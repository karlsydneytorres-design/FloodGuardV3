// ============================================================
//  js/profile.js  — only runs on profile.html
// ============================================================

import { getUserProfile, updateUserProfile } from "/js/profile-utils.js";

// Profile dropdown
const profileDropdown = document.querySelector('.profile-dropdown-container');
const dropdownMenu    = document.querySelector('.profile-dropdown-menu');

if (profileDropdown && dropdownMenu) {
  profileDropdown.addEventListener('click', (event) => {
    event.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
  window.onclick = function(event) {
    if (!event.target.closest('.profile-dropdown-container')) {
      dropdownMenu.classList.remove('show');
    }
  };
}

function saveProfile(event) {
  event.preventDefault();
  const fullName = document.getElementById('fullName')?.value || '';
  const email    = document.getElementById('email')?.value    || '';

  const displayName = document.getElementById('displayName');
  if (displayName) displayName.textContent = fullName || 'User';

  const userDisplayName = document.getElementById('userDisplayName');
  if (userDisplayName) userDisplayName.innerHTML = `Welcome <br> ${fullName || 'User'}`;

  const successMessage = document.getElementById('successMessage');
  if (successMessage) {
    successMessage.style.display = 'block';
    setTimeout(() => { successMessage.style.display = 'none'; }, 3000);
  }
  return false;
}

function changePassword() {
  const currentPassword = document.getElementById('currentPassword')?.value || '';
  const newPassword     = document.getElementById('newPassword')?.value     || '';
  const confirmPassword = document.getElementById('confirmPassword')?.value || '';

  if (!newPassword || !currentPassword) {
    alert('Please enter your current password and a new password.');
    return;
  }
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match.');
    return;
  }
  alert('Password update simulated successfully.');
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value      = '';
  document.getElementById('confirmPassword').value  = '';
}

function resetForm() {
  if (confirm('Are you sure you want to reset all changes?')) {
    document.getElementById('profileForm')?.reset();
  }
}

function uploadPhoto() {
  document.getElementById('photoInput')?.click();
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const profileImage = document.getElementById('profileImage');
      if (profileImage) profileImage.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = '/auth/auth.html';
  }
}

window.saveProfile    = saveProfile;
window.changePassword = changePassword;
window.resetForm      = resetForm;
window.uploadPhoto    = uploadPhoto;
window.previewPhoto   = previewPhoto;
window.logout         = logout;

document.addEventListener('DOMContentLoaded', () => {
  const emailField = document.getElementById('email');
  if (emailField) {
    emailField.addEventListener('blur', function () {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      this.style.borderColor = (this.value && !emailRegex.test(this.value)) ? '#ef4444' : '#e5e7eb';
    });
  }

  const phoneField = document.getElementById('phone');
  if (phoneField) {
    phoneField.addEventListener('blur', function () {
      const phoneRegex = /^(\+63|0)?[0-9]{10}$/;
      this.style.borderColor = (this.value && !phoneRegex.test(this.value.replace(/\s/g, ''))) ? '#ef4444' : '#e5e7eb';
    });
  }

  const newPasswordField     = document.getElementById('newPassword');
  const confirmPasswordField = document.getElementById('confirmPassword');
  if (newPasswordField) {
    newPasswordField.addEventListener('input', function () {
      this.style.borderColor = this.value.length > 0 && this.value.length < 8 ? '#ef4444'
                             : this.value.length >= 8                          ? '#10b981' : '';
      if (confirmPasswordField) {
        confirmPasswordField.style.borderColor =
          (confirmPasswordField.value && this.value !== confirmPasswordField.value) ? '#ef4444' : '#10b981';
      }
    });
  }
  if (confirmPasswordField) {
    confirmPasswordField.addEventListener('input', function () {
      const newPassword = document.getElementById('newPassword')?.value || '';
      this.style.borderColor = this.value && newPassword !== this.value ? '#ef4444'
                             : this.value && newPassword === this.value ? '#10b981' : '#e5e7eb';
    });
  }

  let formChanged = false;
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('input', () => { formChanged = true; });
  }
  window.addEventListener('beforeunload', (e) => {
    if (formChanged) { e.preventDefault(); e.returnValue = ''; }
  });
});