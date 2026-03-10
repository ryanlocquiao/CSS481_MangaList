/**
 * js/favorites.js - Favorites Page Controller
 *
 * Reads from LocalStorage and builds the favorites grid UI.
 */

document.addEventListener('DOMContentLoaded', () => loadFavorites());

window.addEventListener('favoritesUpdated', () => loadFavorites());

/**
 * Reads favorites from LocalStorage and renders the grid.
 * Handles corrupt data and missing DOM elements gracefully.
 */
function loadFavorites() {
    const gridContainer = document.getElementById('favorites-grid');

    if (!gridContainer) {
        console.error('loadFavorites: #favorites-grid element not found in DOM.');
        return;
    }

    let favorites = [];

    try {
        const raw = localStorage.getItem('mangaFavorites');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                favorites = parsed;
            } else {
                console.warn('loadFavorites: mangaFavorites is not an array — resetting to empty list.');
                localStorage.removeItem('mangaFavorites');
            }
        }
    } catch (err) {
        console.error('loadFavorites: Failed to parse mangaFavorites from localStorage:', err);
        localStorage.removeItem('mangaFavorites');
        gridContainer.innerHTML = `
            <div class="empty-library-msg">
                <p>Your favorites data could not be read and has been reset.</p>
                <p style="margin-top: 10px;"><a href="index.html">Go browse the catalog</a> to add some favorites!</p>
            </div>`;
        return;
    }

    gridContainer.innerHTML = '';

    if (favorites.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-library-msg">
                <p>You haven't added any manga to your favorites yet.</p>
                <p style="margin-top: 10px;"><a href="index.html">Go browse the catalog</a> to find your next read!</p>
            </div>`;
        return;
    }

    let cardsRendered = 0;

    favorites.forEach((manga, index) => {
        // Guard: skip entries that are missing the required id field
        if (!manga || typeof manga !== 'object' || !manga.id) {
            console.warn(`loadFavorites: Skipping invalid favorites entry at index ${index}:`, manga);
            return;
        }

        try {
            const card = UIHelper.createMangaCard(manga, (m) => ModalController.open(m));
            gridContainer.appendChild(card);
            cardsRendered++;
        } catch (cardErr) {
            console.error(`loadFavorites: Failed to create card for manga ${manga.id}:`, cardErr);
            // Skip this card and continue rendering the rest
        }
    });

    // If no valid cards were created despite having data, show a helpful message
    if (cardsRendered === 0 && favorites.length > 0) {
        gridContainer.innerHTML = `
            <div class="empty-library-msg">
                <p>Your favorites list appears to be corrupted.</p>
                <p style="margin-top: 10px;"><a href="index.html">Go browse the catalog</a> to add new favorites.</p>
            </div>`;
    }
}