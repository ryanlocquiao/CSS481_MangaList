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

/**
 * Calculates and displays user statistics based on their saved
 * data.
 */
function loadProfileStats() {
    const favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
    const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};

    const favCountElem = document.getElementById('fav-count');
    if (favCountElem) favCountElem.textContent = favorites.length;

    const totalReadElem = document.getElementById('read-count');
    if (totalReadElem) totalReadElem.textContent = Object.keys(progress).length;
}

// TODO: Create function to edit bio