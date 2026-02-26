/**
 * js/auth.js - Firebase Authentication Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    injectAuthModel();
    setupAuthListeners();
});

function injectAuthModel() {
    const modalHTML = `
        <div id="auth-modal" class="modal hidden" style="z-index: 2000;">
            <div id="auth-overlay" class="modal-overlay"></div>
            <div class="modal-content auth-layout">
                <button id="close-auth-btn" class="close-btn">&times;</button>
                <h2 id="auth-title">Sign In</h2>
                <form id="auth-form">
                    <input type="email" id="auth-email" placeholder="Email Address" required>
                    <input type="password" id="auth-password" placeholder="Password" required>
                    <button type="submit" class="btn-read" style="width: 100%; margin-top: 20px; padding: 14px;">Sign In</button>
                    <p id="auth-error" style="color: #e50914; font-size: 0.85rem; margin-top: 10px; display: none;"></p>
                    <p class="auth-switch"><span id="auth-toggle-pretext">New to MangaList? </span><span id="auth-toggle">Sign up now.</span></p>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function setupAuthListeners() {
    let isSignUpMode = false;

    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authToggle = document.getElementById('auth-toggle');
    const togglePretext = document.getElementById('auth-toggle-pretext');
    const authError = document.getElementById('auth-error');
    const submitBtn = authForm.querySelector('button[type="submit"]');

    // Open/Close logic
    document.getElementById('nav-login-btn')?.addEventListener('click', () => {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    })

    const closeModal = () => {
        authModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        authForm.reset();
        authError.style.display = 'none';
    };

    document.getElementById('close-auth-btn').addEventListener('click', closeModal);
    document.getElementById('auth-overlay').addEventListener('click', closeModal);

    // Toggle Login/Sign Up
    authToggle.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            authTitle.textContent = 'Sign Up';
            submitBtn.textContent = 'Sign Up';
            togglePretext.textContent = 'Already have an account? ';
            authToggle.textContent = 'Sign in now.';
        } else {
            authTitle.textContent = 'Sign In';
            submitBtn.textContent = 'Sign In';
            togglePretext.textContent = 'New to MangaList? ';
            authToggle.textContent = 'Sign up now.';
        }
        authError.style.display = 'none';
    });

    // Form submission communication to Firebase
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        authError.style.display = 'none';
        submitBtn.textContent = 'Please wait...';

        try {
            if (isSignUpMode) {
                await auth.createUserWithEmailAndPassword(email, password);
                await CloudSync.saveToCloud();
            } else {
                auth.signInWithEmailAndPassword(email, password);
                await CloudSync.loadFromCloud();
            }
            closeModal();
            window.location.reload();
        } catch (error) {
            authError.textContent = error.message;
            authError.style.display = 'block';
            submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
        }
    });

    // Handle Log Out
    document.getElementById('nav-logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await auth.signOut();

        localStorage.removeItem('mangaFavorites');
        localStorage.removeItem('readingProgress');

        window.location.href = 'index.html';
    });

    // Global Firebase State Observer
    auth.onAuthStateChanged(user => {
        const navLoginBtn = document.getElementById('nav-login-btn');
        const navUserProfile = document.getElementById('nav-user-profile');

        if (user) {
            // User is logged in: Hide Sign In, show avatar
            if (navLoginBtn) navLoginBtn.style.display = 'none';
            if (navUserProfile) navUserProfile.classList.remove('hidden');
        } else {
            // User is logged out: Show Sign In, hide avatar
            if (navLoginBtn) navLoginBtn.style.display = 'block';
            if (navUserProfile) navUserProfile.classList.add('hidden');

            // Send them to home page if they log out on a private page
            const privatePages = ['profile.html', 'settings.html', 'favorites.html'];
            const currentPage = window.location.pathname.split('/').pop();
            if (privatePages.includes(currentPage)) {
                window.location.href = 'index.html';
            }
        }
    });
}