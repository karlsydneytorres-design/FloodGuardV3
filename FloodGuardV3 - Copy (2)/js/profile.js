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
    }
}

// Form validation and submission
function saveProfile(event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    const alternatePhone = document.getElementById('alternatePhone')?.value || '';
    const emergencyContact = document.getElementById('emergencyContact')?.value || '';

    document.getElementById('displayName').textContent = fullName || 'User';
    document.getElementById('userDisplayName').innerHTML = `Welcome <br> ${fullName || 'User'}`;

    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }

    console.log('Profile saved locally:', { fullName, email, phone, alternatePhone, emergencyContact });
    return false;
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value || '';
    const newPassword = document.getElementById('newPassword')?.value || '';
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
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// Reset form to original values
function resetForm() {
    if (confirm('Are you sure you want to reset all changes? This will restore the original values.')) {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) profileForm.reset();

        const defaults = {
            firstName: 'Ernest',
            lastName: 'Lazatin',
            middleName: 'Santos',
            email: 'ernest.lazatin@example.com',
            phone: '+63 917 123 4567',
            streetAddress: '123 Sampaguita Street',
            barangay: 'Colgante',
            municipality: 'Apalit',
            province: 'Pampanga',
            zipCode: '2016',
            bio: 'Dedicated community leader serving Barangay Colgante for over 10 years. Committed to ensuring the safety and welfare of all residents through effective flood monitoring and emergency response coordination.',
            displayName: 'Ernest Lazatin'
        };

        Object.entries(defaults).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        const displayName = document.getElementById('displayName');
        if (displayName) displayName.textContent = defaults.displayName;

        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });

        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.style.borderColor = '#e5e7eb';
        });
    }
}

// Photo upload functionality
function uploadPhoto() {
    const photoInput = document.getElementById('photoInput');
    if (photoInput) photoInput.click();
}

function previewPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const profileImage = document.getElementById('profileImage');
            if (profileImage) profileImage.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
        window.location.href = 'index.html';
    }
}

// Real-time validation
document.addEventListener('DOMContentLoaded', function() {
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            this.style.borderColor = (this.value && !emailRegex.test(this.value)) ? '#ef4444' : '#e5e7eb';
        });
    }

    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('blur', function() {
            const phoneRegex = /^(\+63|0)?[0-9]{10}$/;
            this.style.borderColor = (this.value && !phoneRegex.test(this.value.replace(/\s/g, ''))) ? '#ef4444' : '#e5e7eb';
        });
    }

    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    if (newPasswordField) {
        newPasswordField.addEventListener('input', function() {
            const password = this.value;
            if (password.length > 0 && password.length < 8) {
                this.style.borderColor = '#ef4444';
            } else if (password.length >= 8) {
                this.style.borderColor = '#10b981';
            }
            if (confirmPasswordField) {
                confirmPasswordField.style.borderColor = (confirmPasswordField.value && password !== confirmPasswordField.value) ? '#ef4444' : '#10b981';
            }
        });
    }

    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function() {
            const newPassword = document.getElementById('newPassword')?.value || '';
            this.style.borderColor = (this.value && newPassword !== this.value) ? '#ef4444' : ((this.value && newPassword === this.value) ? '#10b981' : '#e5e7eb');
        });
    }

    let saveTimeout;
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.type !== 'password' && input.type !== 'file') {
            input.addEventListener('input', function() {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    console.log('Auto-saving changes...');
                }, 2000);
            });
        }
    });
});

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) navMenu.classList.toggle('mobile-active');
}

let formChanged = false;
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('input', function() {
        formChanged = true;
    });
}

window.addEventListener('beforeunload', function(e) {
    if (formChanged) {
        e.preventDefault();
        e.returnValue = '';
    }
});