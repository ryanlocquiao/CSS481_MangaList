/**
 * js/settings.js - Settings Page Contoller
 * 
 * Manages the UI components to the Settings page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const confirmDelete = confirm("Are you sure you want to delete all your saved favorites? This cannot be undone.");
            if (confirmDelete) {
                localStorage.removeItem('mangaFavorites');
                alert("All local data has been cleared.");
            }
        });
    }
});