/**
 * js/favorites.js - Favorites Page Controller
 * 
 * Reads from Local Storage and builds the grid UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    
});

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
        const itemContainer = document.createElement('div');
        itemContainer.className = 'manga-item';

        const card = document.createElement('div');
        card.className = 'manga-card';
        card.style.backgroundImage = `url('${manga.coverImage}')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.title = manga.title;

        const titleElem = document.createElement('div');
        titleElem.className = 'manga-title-below';
        titleElem.textContent = manga.title;
        titleElem.title = manga.title;

        card.addEventListener('click', () => openModal(manga));
        titleElem.addEventListener('click', () => openModal(manga));

        itemContainer.appendChild(card);
        itemContainer.appendChild(titleElem);
        gridContainer.appendChild(itemContainer);
    });
}

function setupModalListener() {
    const closeBtn = document.querySelector('.close-btn');
}