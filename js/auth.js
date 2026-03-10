/**
 * js/auth.js - Firebase Authentication Controller
 *
 * Manages user session state, handles the UI for the
 * login/signup modal, and communicates with Firebase Authentication.
 */

document.addEventListener('DOMContentLoaded', () => {
    injectAuthModel();
    setupAuthListeners();
});

/**
 * Dynamically injects the Authentication Modal HTML into the DOM.
 */
function injectAuthModel() {
    if (document.getElementById('auth-modal')) return; // Prevent double injection

    const modalHTML = `
        <div id="auth-modal" class="modal hidden" style="z-index: 2000;">
            <div id="auth-overlay" class="modal-overlay"></div>
            <div class="modal-content auth-layout">
                <button id="close-auth-btn" class="close-btn">&times;</button>
                <h2 id="auth-title">Sign In</h2>
                <form id="auth-form">
                    <input type="email" id="auth-email" placeholder="Email Address" autocomplete="off" required>
                    <div class="password-wrapper">
                        <input type="password" id="auth-password" placeholder="Password" autocomplete="new-password" required>
                        <span id="toggle-password" class="toggle-password">Show</span>
                    </div>
                    <button type="submit" class="btn-read" style="width: 100%; margin-top: 20px; padding: 14px;">Sign In</button>
                    <p id="auth-error" style="color: #e50914; font-size: 0.85rem; margin-top: 10px; display: none;"></p>
                    <p class="auth-switch">
                        <span id="auth-toggle-pretext">New to MangaList? </span>
                        <span id="auth-toggle">Sign up now.</span>
                    </p>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Maps Firebase Auth error codes to friendly, user-readable messages.
 * Raw SDK messages like "Firebase: Error (auth/wrong-password)" are not acceptable UX.
 *
 * @param {Error} error - Firebase Auth error object.
 * @returns {string} - Human-readable error message.
 */
function getFriendlyAuthError(error) {
    const code = error?.code || '';
    const friendlyMessages = {
        'auth/invalid-email':            'Please enter a valid email address.',
        'auth/user-not-found':           'No account found with that email. Try signing up instead.',
        'auth/wrong-password':           'Incorrect password. Please try again.',
        'auth/invalid-credential':       'Incorrect email or password. Please try again.',
        'auth/email-already-in-use':     'An account with this email already exists. Try signing in.',
        'auth/weak-password':            'Password must be at least 6 characters long.',
        'auth/too-many-requests':        'Too many failed attempts. Please wait a moment before trying again.',
        'auth/network-request-failed':   'Network error — check your internet connection and try again.',
        'auth/user-disabled':            'This account has been disabled. Contact support for help.',
        'auth/operation-not-allowed':    'This sign-in method is not enabled. Please contact support.',
        'auth/popup-closed-by-user':     'Sign-in was cancelled.',
    };
    return friendlyMessages[code] || 'An unexpected error occurred. Please try again.';
}

/**
 * Wires up all event listeners for the authentication flow.
 */
function setupAuthListeners() {
    let isSignUpMode = false;

    const authModal     = document.getElementById('auth-modal');
    const authForm      = document.getElementById('auth-form');
    const authTitle     = document.getElementById('auth-title');
    const authToggle    = document.getElementById('auth-toggle');
    const togglePretext = document.getElementById('auth-toggle-pretext');
    const authError     = document.getElementById('auth-error');
    const submitBtn     = authForm?.querySelector('button[type="submit"]');
    const passwordInput = document.getElementById('auth-password');
    const togglePasswordBtn = document.getElementById('toggle-password');

    // Guard: all required elements must be present before wiring listeners
    if (!authModal || !authForm || !authTitle || !authToggle || !authError || !submitBtn || !passwordInput) {
        console.error('setupAuthListeners: One or more required auth elements are missing from the DOM.');
        return;
    }

    /**
     * Resets the modal to a clean state (clears fields, hides errors, restores button).
     */
    function resetModal() {
        authForm.reset();
        authError.style.display = 'none';
        authError.textContent = '';
        if (passwordInput) {
            passwordInput.setAttribute('type', 'password');
        }
        if (togglePasswordBtn) {
            togglePasswordBtn.textContent = 'Show';
        }
        submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
        submitBtn.disabled = false;
    }

    /**
     * Displays an error message inside the modal.
     *
     * @param {string} message
     */
    function showError(message) {
        authError.textContent = message;
        authError.style.display = 'block';
    }

    const closeModal = () => {
        authModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        resetModal();
    };

    // Open auth modal
    document.getElementById('nav-login-btn')?.addEventListener('click', () => {
        resetModal();
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    // Close via button or overlay
    document.getElementById('close-auth-btn')?.addEventListener('click', closeModal);
    document.getElementById('auth-overlay')?.addEventListener('click', closeModal);

    // Toggle Show/Hide Password
    togglePasswordBtn?.addEventListener('click', () => {
        const isHidden = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isHidden ? 'text' : 'password');
        togglePasswordBtn.textContent = isHidden ? 'Hide' : 'Show';
    });

    // Toggle Sign In / Sign Up mode
    authToggle.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        authError.style.display = 'none';

        if (isSignUpMode) {
            authTitle.textContent    = 'Sign Up';
            submitBtn.textContent    = 'Sign Up';
            togglePretext.textContent = 'Already have an account? ';
            authToggle.textContent   = 'Sign in now.';
        } else {
            authTitle.textContent    = 'Sign In';
            submitBtn.textContent    = 'Sign In';
            togglePretext.textContent = 'New to MangaList? ';
            authToggle.textContent   = 'Sign up now.';
        }
    });

    // Form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.style.display = 'none';

        const email    = document.getElementById('auth-email')?.value?.trim() || '';
        const password = passwordInput?.value || '';

        // Client-side validation before hitting Firebase
        if (!email) {
            showError('Please enter your email address.');
            return;
        }
        if (!password) {
            showError('Please enter your password.');
            return;
        }
        if (isSignUpMode && password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }

        submitBtn.textContent = 'Please wait...';
        submitBtn.disabled = true;

        try {
            if (typeof auth === 'undefined') {
                throw new Error('Firebase Auth is not initialized. Check firebase-init.js.');
            }

            if (isSignUpMode) {
                await auth.createUserWithEmailAndPassword(email, password);
                // Push any existing guest data to cloud on first sign-up
                if (typeof CloudSync !== 'undefined') {
                    await CloudSync.saveToCloud().catch(err =>
                        console.error('auth.js: CloudSync.saveToCloud failed after sign-up:', err)
                    );
                }
            } else {
                await auth.signInWithEmailAndPassword(email, password);
                // Pull cloud data and merge with local on login
                if (typeof CloudSync !== 'undefined') {
                    await CloudSync.loadFromCloud().catch(err =>
                        console.error('auth.js: CloudSync.loadFromCloud failed after sign-in:', err)
                    );
                }
            }

            closeModal();
            window.location.reload();

        } catch (error) {
            console.error('auth.js: Firebase auth error:', error);
            showError(getFriendlyAuthError(error));
            submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
            submitBtn.disabled = false;
            // Clear the password field on failure so the user starts fresh
            if (passwordInput) passwordInput.value = '';
        }
    });

    // Handle Log Out
    document.getElementById('nav-logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            if (typeof auth === 'undefined') {
                throw new Error('Firebase Auth is not initialized.');
            }
            await auth.signOut();
        } catch (err) {
            console.error('auth.js: Sign-out failed:', err);
            // Don't block local cleanup even if the Firebase call fails
        }

        try {
            localStorage.removeItem('mangaFavorites');
            localStorage.removeItem('readingProgress');
        } catch (storageErr) {
            console.error('auth.js: Failed to clear localStorage on logout:', storageErr);
        }

        window.location.href = 'index.html';
    });

    // Global Firebase State Observer
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => {
            const navLoginBtn    = document.getElementById('nav-login-btn');
            const navUserProfile = document.getElementById('nav-user-profile');

            if (user) {
                if (navLoginBtn)    navLoginBtn.style.display = 'none';
                if (navUserProfile) navUserProfile.classList.remove('hidden');
            } else {
                if (navLoginBtn)    navLoginBtn.style.display = 'block';
                if (navUserProfile) navUserProfile.classList.add('hidden');

                // Redirect away from private pages on logout
                const privatePages = ['profile.html', 'settings.html', 'favorites.html'];
                const currentPage  = window.location.pathname.split('/').pop();
                if (privatePages.includes(currentPage)) {
                    window.location.href = 'index.html';
                }
            }
        });
    } else {
        console.error('auth.js: Firebase `auth` object is undefined. Check that firebase-init.js loaded first.');
    }
}