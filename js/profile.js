/**
 * js/profile.js - Profile Page Contoller
 * 
 * Manages the UI components to the Profile page.
 */

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('profile-email').textContent = user.email;

            loadProfileStats();
        }
    });
});

function loadProfileStats() {
    const favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
    document.getElementById('fav-count').textContent = favorites.length;
}

// TODO: Create function to edit bio