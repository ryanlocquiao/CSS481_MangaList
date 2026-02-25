/**
 * js/settings.js - Settings Page Contoller
 * 
 * Manages the UI components to the Settings page.
 */

document.addEventListener('DOMContentLoaded', () => {
    setupDropdown();

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