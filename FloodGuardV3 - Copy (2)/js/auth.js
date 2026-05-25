const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleBtn = document.getElementById('toggleBtn');
const toggleText = document.getElementById('toggleText');

// Modal elements
const termsModal = document.getElementById('termsModal');
const acceptTermsCheckbox = document.getElementById('acceptTerms');
const acceptTermsBtn = document.getElementById('acceptTermsBtn');
const cancelTermsBtn = document.getElementById('cancelTerms');

let isLoginForm = true;
let currentFormType = '';

if (acceptTermsCheckbox) {
    acceptTermsCheckbox.addEventListener('change', function() {
        if (acceptTermsBtn) acceptTermsBtn.disabled = !this.checked;
    });
}

function showTermsModal(formType) {
    currentFormType = formType;
    if (termsModal) {
        termsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideTermsModal() {
    if (termsModal) {
        termsModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    if (acceptTermsCheckbox) acceptTermsCheckbox.checked = false;
    if (acceptTermsBtn) acceptTermsBtn.disabled = true;
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `✅ ${message}`;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.classList.add('show'), 100);
    setTimeout(() => {
        successDiv.classList.remove('show');
        setTimeout(() => document.body.removeChild(successDiv), 300);
    }, 4000);
}

if (cancelTermsBtn) cancelTermsBtn.addEventListener('click', hideTermsModal);
if (acceptTermsBtn) {
    acceptTermsBtn.addEventListener('click', function() {
        hideTermsModal();
        showSuccessMessage(`${currentFormType} successful! Welcome to FloodGuard.`);

        if (currentFormType === 'Login' && loginForm) {
            loginForm.reset();
        } else if (registerForm) {
            registerForm.reset();
        }

        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);
    });
}

if (termsModal) {
    termsModal.addEventListener('click', function(e) {
        if (e.target === termsModal) {
            hideTermsModal();
        }
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && termsModal && termsModal.classList.contains('active')) {
        hideTermsModal();
    }
});

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        if (loginForm && registerForm && toggleText) {
            if (isLoginForm) {
                loginForm.classList.remove('active');
                registerForm.classList.add('active');
                toggleText.textContent = 'Already have an account?';
                toggleBtn.textContent = 'Sign In';
                isLoginForm = false;
            } else {
                registerForm.classList.remove('active');
                loginForm.classList.add('active');
                toggleText.textContent = "Don't have an account?";
                toggleBtn.textContent = 'Create Account';
                isLoginForm = true;
            }
        }
    });
}

function handleSubmit(form, formType) {
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('.submit-btn');
        if (!submitBtn) return;

        submitBtn.classList.add('loading');
        const email = form.email ? form.email.value : '';
        const password = form.password ? form.password.value : '';

        if (formType === 'Registration') {
            const confirmPassword = form.confirmPassword ? form.confirmPassword.value : '';
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                submitBtn.classList.remove('loading');
                return;
            }
        }

        setTimeout(() => {
            submitBtn.classList.remove('loading');
            showTermsModal(formType);
        }, 600);
    });
}

handleSubmit(loginForm, 'Login');
handleSubmit(registerForm, 'Registration');

const confirmPasswordField = document.getElementById('confirmPassword');
if (confirmPasswordField) {
    confirmPasswordField.addEventListener('input', function() {
        const password = document.getElementById('registerPassword')?.value || '';
        const confirmPassword = this.value;
        this.style.borderColor = (password !== confirmPassword && confirmPassword !== '') ? '#ef4444' : '#e5e7eb';
    });
}

