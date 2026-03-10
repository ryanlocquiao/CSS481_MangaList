/**
 * js/modal.js - Global Modal Controller
 *
 * Injects the Manga Details modal into the DOM and handles all
 * API fetching, rendering, and user interactions
 * (Favorites, Chapter routing) for the pop-up.
 */

const ModalController = {
    /**
     * Injects the empty HTML shell of the modal into the document body
     * and sets up the universal close listeners.
     */
    init() {
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

    /**
     * Populates the modal with manga data and opens it.
     *
     * @param {Object} manga - The active manga data object.
     */
    async open(manga) {
        // Guard: reject null or structurally invalid manga objects before touching the DOM
        if (!manga || typeof manga !== 'object') {
            console.error('ModalController.open: Called with invalid manga object:', manga);
            return;
        }
        if (!manga.id) {
            console.error('ModalController.open: Manga object is missing required id field:', manga);
            return;
        }

        const modal = document.getElementById('manga-modal');
        if (!modal) {
            console.error('ModalController.open: Modal element not found in DOM. Was init() called?');
            return;
        }

        const coverImage  = modal.querySelector('.modal-cover-image');
        const title       = modal.querySelector('.modal-title');
        const rating      = modal.querySelector('.modal-rating');
        const status      = modal.querySelector('.modal-status');
        const synopsis    = modal.querySelector('.modal-synopsis');
        const tagsContainer  = modal.querySelector('.modal-tags');
        const bookmarkIcon   = modal.querySelector('#bookmark-icon');
        const chaptersList   = modal.querySelector('#modal-chapters-list');
        const btnRead        = modal.querySelector('.btn-read');
        const btnFavorite    = modal.querySelector('.btn-favorite');

        // Defensive check — all elements must exist before we write to them
        const requiredEls = { coverImage, title, rating, status, synopsis, tagsContainer, bookmarkIcon, chaptersList, btnRead, btnFavorite };
        for (const [name, el] of Object.entries(requiredEls)) {
            if (!el) {
                console.error(`ModalController.open: Required modal element '${name}' not found.`);
                return;
            }
        }

        // --- Route to Reader ---
        btnRead.onclick = () => {
            window.location.href = `reader.html?mangaId=${manga.id}`;
        };

        // --- Favorites Logic ---
        let favorites = ModalController._loadFavorites();
        let isFav = favorites.some(fav => fav.id === manga.id);
        bookmarkIcon.src = isFav ? 'assets/bookmark-filled.png' : 'assets/bookmark-empty.png';

        btnFavorite.onclick = () => {
            favorites = ModalController._loadFavorites();
            isFav = favorites.some(fav => fav.id === manga.id);

            if (isFav) {
                favorites = favorites.filter(fav => fav.id !== manga.id);
                bookmarkIcon.src = 'assets/bookmark-empty.png';
            } else {
                favorites.push(manga);
                bookmarkIcon.src = 'assets/bookmark-filled.png';
            }

            try {
                localStorage.setItem('mangaFavorites', JSON.stringify(favorites));
            } catch (storageErr) {
                console.error('ModalController: Failed to save favorites to localStorage:', storageErr);
                MangaService._showToast('Could not save your favorite — storage may be full.');
                return;
            }

            if (typeof CloudSync !== 'undefined') {
                CloudSync.saveToCloud().catch(err =>
                    console.error('ModalController: CloudSync.saveToCloud failed:', err)
                );
            }

            window.dispatchEvent(new Event('favoritesUpdated'));
        };

        // --- Populate UI ---
        if (manga.coverImage) {
            coverImage.style.backgroundImage = `url('${manga.coverImage}')`;
        } else {
            coverImage.style.backgroundImage = '';
            coverImage.style.backgroundColor = '#333';
        }

        title.textContent    = manga.title || 'Unknown Title';
        synopsis.textContent = manga.description || 'No description available.';
        rating.textContent   = manga.rating ? manga.rating.toUpperCase() : 'N/A';
        status.textContent   = manga.status
            ? manga.status.charAt(0).toUpperCase() + manga.status.slice(1)
            : 'Unknown';

        if (Array.isArray(manga.tags) && manga.tags.length > 0) {
            tagsContainer.innerHTML = manga.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
        } else {
            tagsContainer.innerHTML = '<span style="color:#666; font-size:0.85rem;">No tags available.</span>';
        }

        chaptersList.innerHTML = '<p style="color: #a3a3a3;">Loading chapters...</p>';

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // --- Async Chapter Fetch ---
        try {
            const feed = await MangaService.getMangaFeed(manga.id);

            if (!feed || !Array.isArray(feed.data) || feed.data.length === 0) {
                chaptersList.innerHTML = '<p style="color: #a3a3a3;">No English chapters are available for this title.</p>';
                return;
            }

            const validChapters = feed.data
                .filter(c => {
                    // Guard: skip entries with missing attributes
                    if (!c || !c.attributes) return false;
                    return c.attributes.pages > 0 && !c.attributes.externalUrl;
                })
                .sort((a, b) => {
                    const aNum = parseFloat(a.attributes.chapter) || 0;
                    const bNum = parseFloat(b.attributes.chapter) || 0;
                    return aNum - bNum;
                });

            if (validChapters.length === 0) {
                chaptersList.innerHTML = '<p style="color: #a3a3a3;">No readable English chapters found. This title may be licensed or region-locked.</p>';
                return;
            }

            chaptersList.innerHTML = '';
            validChapters.forEach(chapter => {
                try {
                    const row = document.createElement('div');
                    row.className = 'chapter-row';

                    const chapNum = chapter.attributes.chapter
                        ? `Chapter ${chapter.attributes.chapter}`
                        : 'Oneshot';
                    const chapTitle = chapter.attributes.title
                        ? `<span class="chapter-title">${chapter.attributes.title}</span>`
                        : '';

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
                } catch (rowErr) {
                    console.error('ModalController.open: Failed to render chapter row:', chapter, rowErr);
                    // Skip this chapter and continue rendering the rest
                }
            });

        } catch (err) {
            console.error('ModalController.open: Failed to load chapter list:', err);
            chaptersList.innerHTML = `
                <p style="color: #ff4444; padding: 10px;">
                    Failed to load chapters. Check your connection and try again.
                </p>`;
        }
    },

    /**
     * Closes the manga details modal.
     */
    close() {
        const modal = document.getElementById('manga-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
    },

    /**
     * Safely reads the favorites list from localStorage.
     * Returns an empty array if the data is missing or corrupted.
     *
     * @returns {Array}
     */
    _loadFavorites() {
        try {
            const raw = localStorage.getItem('mangaFavorites');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.error('ModalController._loadFavorites: Corrupt favorites data, resetting:', err);
            localStorage.removeItem('mangaFavorites');
            return [];
        }
    },
};

document.addEventListener('DOMContentLoaded', () => ModalController.init());