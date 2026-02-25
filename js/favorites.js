/**
 * js/favorites.js - Favorites Page Controller
 * 
 * Reads from Local Storage and builds the grid UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
    setupModalListener();
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
    const overlay = document.querySelector('.modal-overlay');
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

function openModal(manga) {
    const modal = document.getElementById('manga-modal');
    const coverImage = modal.querySelector('.modal-cover-image');
    const title = modal.querySelector('.modal-title');
    const rating = modal.querySelector('.modal-rating');
    const status = modal.querySelector('.modal-status');
    const synopsis = modal.querySelector('.modal-synopsis');
    const tagsContainer = modal.querySelector('.modal-tags');

    // Route to Theater Mode
    const readBtn = modal.querySelector('.btn-read');
    readBtn.onclick = () => {
        window.location.href = `reader.html?mangaId=${manga.id}`;
    };

    // Favorites Toggle Logic
    const favBtn = modal.querySelector('.btn-favorite');
    const bookmarkIcon = modal.querySelector('#bookmark-icon');
    let favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
    let isFav = favorites.some(fav => fav.id === manga.id);

    if (isFav) {
        bookmarkIcon.src = 'assets/bookmark-filled.png';
    } else {
        bookmarkIcon.src = 'assets/bookmark-empty.png';
    }

    favBtn.onclick = () => {
        favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
        isFav = favorites.some(fav => fav.id === manga.id);

        if (isFav) {
            favorites = favorites.filter(fav => fav.id !== manga.id);
            bookmarkIcon.src = 'assets/bookmark-empty.png';
        } else {
            favorites.push(manga);
            bookmarkIcon.src = 'assets/bookmark-filled.png';
        }

        localStorage.setItem('mangaFavorites', JSON.stringify(favorites));

        // Refresh background if title removed
        loadFavorites();
    };

    // Inject content
    coverImage.style.backgroundImage = `url('${manga.coverImage}')`;
    title.textContent = manga.title;
    synopsis.textContent = manga.description;
    rating.textContent = manga.rating ? manga.rating.toUpperCase() : 'N/A';
    status.textContent = manga.status ? manga.status.charAt(0).toUpperCase() + manga.status.slice(1) : 'Unknown';

    tagsContainer.innerHTML = '';
    if (manga.tags && manga.tags.length > 0) {
        manga.tags.forEach(tagText => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tagText;
            tagsContainer.appendChild(tagSpan);
        });
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('manga-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
}