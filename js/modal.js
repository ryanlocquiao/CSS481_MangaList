/**
 * js/modal.js - Global Modal Controller
 * 
 * Injects the Manga Details modal into the DOM and handles all
 * API fetching, rendering, and user interactions
 * (Favorites, Chapter routing) for the pop-up.
 */

const ModalController = {
    init() {
        // Only inject the HTML if it doesn't already exist
        if (document.getElementById('manga-modal')) return;

        const modalHTML = `
            <div id="manga-modal" class="modal hidden">
                <div class="modal-overlay"></div>
                <div class="modal-content wide-layout">
                    <button class="close-btn">&times;</button>
                    <div class="modal-cover-col">
                        <div class="modal-cover-image"></div>
                    </div>
                    <div class="modal-details-col">
                        <h2 class="modal-title">Loading...</h2>
                        <div class="modal-meta">
                            <div class="meta-group">
                                <span class="meta-label">Rating:</span>
                                <span class="modal-rating">...</span>
                            </div>
                            <div class="meta-group">
                                <span class="meta-label">Status:</span>
                                <span class="modal-status">...</span>
                            </div>
                        </div>
                        <p class="modal-synopsis">...</p>
                        <div class="modal-tags"></div>
                        <div class="modal-chapters-container">
                            <h3 class="modal-chapters-header">Chapters</h3>
                            <div id="modal-chapters-list" class="chapters-list"></div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn-read">Read Now</button>
                            <button class="btn-favorite" title="Toggle Favorite">
                                <img id="bookmark-icon" src="assets/bookmark-empty.png" alt="Bookmark" width="22" height="22">
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.querySelector('#manga-modal .close-btn').addEventListener('click', this.close);
        document.querySelector('#manga-modal .modal-overlay').addEventListener('click', this.close);
    },

    async open(manga) {
        const modal = document.getElementById('manga-modal');
        const coverImage = modal.querySelector('.modal-cover-image');
        const title = modal.querySelector('.modal-title');
        const rating = modal.querySelector('.modal-rating');
        const status = modal.querySelector('.modal-status');
        const synopsis = modal.querySelector('.modal-synopsis');
        const tagsContainer = modal.querySelector('.modal-tags');
        const bookmarkIcon = modal.querySelector('#bookmark-icon');
        const chaptersList = modal.querySelector('#modal-chapters-list');

        // Route to Reader
        modal.querySelector('.btn-read').onclick = () => {
            window.location.href = `reader.html?mangaId=${manga.id}`;
        };

        // Favorites Logic
        let favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
        let isFav = favorites.some(fav => fav.id === manga.id);
        bookmarkIcon.src = isFav ? 'assets/bookmark-filled.png' : 'assets/bookmark-empty.png';

        modal.querySelector('.btn-favorite').onclick = () => {
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
            if (typeof CloudSync !== 'undefined') CloudSync.saveToCloud();

            // Broadcast an event so pages like favorites.js know to refresh their grids
            window.dispatchEvent(new Event('favoritesUpdated'));
        };

        // Inject UI Content
        coverImage.style.backgroundImage = `url('${manga.coverImage}')`;
        title.textContent = manga.title;
        synopsis.textContent = manga.description;
        rating.textContent = manga.rating ? manga.rating.toUpperCase() : 'N/A';
        status.textContent = manga.status ? manga.status.charAt(0).toUpperCase() + manga.status.slice(1) : 'Unknown';

        tagsContainer.innerHTML = manga.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        chaptersList.innerHTML = '<p style="color: #a3a3a3;">Loading chapters...</p>';

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Fetch and build chapters asynchronously
        try {
            const feed = await MangaService.getMangaFeed(manga.id);
            if (!feed?.data?.length) {
                chaptersList.innerHTML = '<p style="color: #a3a3a3;">No chapters available.</p>';
                return;
            }

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
                        <div class="chapter-info"><span class="chapter-number">${chapNum}</span>${chapTitle}</div>
                        <span style="font-size: 1.2rem;">&#9654;</span>
                    `;
                    row.onclick = () => window.location.href = `reader.html?mangaId=${manga.id}&chapterId=${chapter.id}`;
                    chaptersList.appendChild(row);
                });
            }
        } catch (err) {
            chaptersList.innerHTML = '<p style="color: #ff4444; padding: 10px;">Failed to load chapters.</p>';
        }
    },

    close() {
        document.getElementById('manga-modal').classList.add('hidden');
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
    }
};

// Initialize modal structure immediately upon loading the script
document.addEventListener('DOMContentLoaded', () => ModalController.init());