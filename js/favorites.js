/**
 * js/favorites.js - Favorites Page Controller
 * 
 * Reads from Local Storage and builds the grid UI.
 */

document.addEventListener('DOMContentLoaded', () => loadFavorites());

window.addEventListener('favoritesUpdated', () => loadFavorites());

function loadFavorites() {
    const gridContainer = document.getElementById('favorites-grid');

    // Pull from browser memory
    const favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];

    gridContainer.innerHTML = '';

    if (favorites.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-library-msg">
                <p>You haven't added any manga to your favorites yet.</p>
                <p style="margin-top: 10px;"><a href="index.html">Go browse the catalog</a> to find your next read!</p>
            </div>`;
        return;
    }

    favorites.forEach(manga => {
        const card = UIHelper.createMangaCard(manga, (m) => ModalController.open(m));
        gridContainer.appendChild(card);
    });
}