/**
 * js/profile.js - Profile Page Contoller
 * 
 * Manages the UI components to the Profile page.
 */

document.addEventListener('DOMContentLoaded', () => {
    setupDropdown();
    loadProfileStats();
});

function setupDropdown() {
    const avatar = document.querySelector('.avatar');
    const dropdown = document.querySelector('.dropdown-menu');

    if (avatar && dropdown) {
        avatar.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (event) => {
            if (!dropdown.contains(event.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

function loadProfileStats() {
    const favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
    document.getElementById('fav-count').textContent = favorites.length;
}

// TODO: Create function to edit bio