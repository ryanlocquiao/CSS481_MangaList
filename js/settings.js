/**
 * js/settings.js - Settings Page Contoller
 * 
 * Manages the UI components to the Settings page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const confirmDelete = confirm("Are you sure you want to delete all your saved data? This cannot be undone.");
            if (confirmDelete) {
                localStorage.removeItem('mangaFavorites');
                localStorage.removeItem('readingProgress');
                
                // If the user is logged in, we also need to push this empty state to Firebase
                if (typeof CloudSync !== 'undefined') CloudSync.saveToCloud();
            }
        });
    }
});