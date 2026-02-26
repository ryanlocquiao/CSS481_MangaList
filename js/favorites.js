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

async function openModal(manga) {
    const modal = document.getElementById('manga-modal');
    const coverImage = modal.querySelector('.modal-cover-image');
    const title = modal.querySelector('.modal-title');
    const rating = modal.querySelector('.modal-rating');
    const status = modal.querySelector('.modal-status');
    const synopsis = modal.querySelector('.modal-synopsis');
    const tagsContainer = modal.querySelector('.modal-tags');
    const bookmarkIcon = document.getElementById('bookmark-icon');

    // Route to Theater Mode
    const readBtn = modal.querySelector('.btn-read');
    readBtn.onclick = () => {
        window.location.href = `reader.html?mangaId=${manga.id}`;
    };

    // Favorites Toggle Logic
    const favBtn = modal.querySelector('.btn-favorite');
    let favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
    let isFav = favorites.some(fav => fav.id === manga.id);
    bookmarkIcon.src = isFav ? 'assets/bookmark-filled.png' : 'assets/bookmark-empty.png';

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

        CloudSync.saveToCloud();

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

    let chaptersContainer = modal.querySelector('.modal-chapters-container');
    if (!chaptersContainer) {
        chaptersContainer = document.createElement('div');
        chaptersContainer.className = 'modal-chapters-container';
        chaptersContainer.innerHTML = `
            <h3 class="modal-chapters-header">Chapters</h3>
            <div id="modal-chapters-list" class="chapters-list"></div>
        `;
        modal.querySelector('.modal-details-col').appendChild(chaptersContainer);
    }

    const chaptersList = chaptersContainer.querySelector('#modal-chapters-list');
    chaptersList.innerHTML = '<p style="color: #a3a3a3;">Loading chapters...</p>';

    try {
        const feed = await MangaService.getMangaFeed(manga.id);
        if (!feed || !feed.data || feed.data.length === 0) {
            chaptersList.innerHTML = '<p style="color: #a3a3a3;">No chapters available.</p>';
        } else {
            let validChapters = feed.data.filter(c => c.attributes.pages > 0 && !c.attributes.externalUrl);
            validChapters.sort((a, b) => parseFloat(a.attributes.chapter || 0) - parseFloat(b.attributes.chapter || 0));

            if (validChapters.length === 0) {
                chaptersList.innerHTML = '<p style="color: #a3a3a3;">No readable English chapters found.</p>';
            } else {
                chaptersList.innerHTML = '';
                validChapters.forEach(chapter => {
                    const row = document.createElement('div');
                    row.className = 'chapter-row';

                    const chapNum = chapter.attributes.chapter ? `Chapter ${chapter.attributes.chapter}` : 'Oneshot';
                    const chapTitle = chapter.attributes.title ? `<span class="chapter-title">${chapter.attributes.title}</span>` : '';

                    row.innerHTML = `
                        <div class="chapter-info">
                            <span class="chapter-number">${chapNum}</span>
                        ${chapTitle}
                        </div>
                        <span style="font-size: 1.2rem;">&#9654;</span>
                    `;

                    row.onclick = () => {
                        window.location.href = `reader.html?mangaId=${manga.id}&chapterId=${chapter.id}`;
                    };
                    chaptersList.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error("Error loading chapters:", err);
        chaptersList.innerHTML = '<p style="color: #ff4444; padding: 10px;">Failed to load chapters.</p>';
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