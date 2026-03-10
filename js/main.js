/**
 * js/main.js - Home Page Controller
 *
 * Manages the UI components and connects the HTML layout to the MangaService API layer.
 */

document.addEventListener('DOMContentLoaded', async () => {
    initDashboard();
    setupScrollListeners();

    // User redirect after finishing a manga chapter
    const urlParams = new URLSearchParams(window.location.search);
    const openModalId = urlParams.get('openModal');

    if (openModalId) {
        try {
            const manga = await MangaService.getMangaById(openModalId);
            if (manga) {
                ModalController.open(manga);
            } else {
                console.warn(`main.js: Could not load manga for openModal param: ${openModalId}`);
            }
        } catch (err) {
            console.error('main.js: Error opening modal from URL param:', err);
        } finally {
            // Always clean the URL param whether we succeeded or not
            window.history.replaceState(null, '', window.location.pathname);
        }
    }
});

/**
 * Master initialization function for the Home Page content.
 */
async function initDashboard() {
    try {
        await loadHeroBanner("Sono Bisque Doll wa Koi");
    } catch (err) {
        console.error('initDashboard: Hero banner failed to load:', err);
        // Page is still usable without the banner — continue loading rows
    }

    const rowContainers = document.querySelectorAll('.row-container');

    if (rowContainers.length < 3) {
        console.warn('initDashboard: Expected at least 3 row containers, found:', rowContainers.length);
    }

    // Run all row fetches concurrently — one failure does not block others
    const rowFetches = [
        rowContainers[0]
            ? populateRow(rowContainers[0], null, 30, "391b0423-d847-456f-aff0-8b0cfc03066b")
            : Promise.resolve(),
        rowContainers[1]
            ? populateRow(rowContainers[1], null, 30, "423e2eae-a7a2-4a8b-ac03-a8351462d71d")
            : Promise.resolve(),
        rowContainers[2]
            ? populateRow(rowContainers[2], null, 30, "cdc58593-87dd-415e-bbc0-2ec27bf404cc")
            : Promise.resolve(),
    ];

    await Promise.allSettled(rowFetches);

    // Load Continue Reading last — it depends on localStorage being ready
    try {
        loadContinueReading();
    } catch (err) {
        console.error('initDashboard: Continue Reading row failed:', err);
    }
}

/**
 * Fetches data for the Hero Banner and dynamically updates the UI.
 * Falls back gracefully if the API call fails or returns no results.
 *
 * @param {string} titleQuery - Title to feature in the banner.
 */
async function loadHeroBanner(titleQuery) {
    const heroBanner = document.querySelector('.hero-banner');
    const heroTitle = document.querySelector('.hero-title');
    const heroSynopsis = document.querySelector('.hero-synopsis');
    const btnRead = document.querySelector('.hero-content .btn-read');
    const btnInfo = document.querySelector('.btn-info');

    if (!heroBanner || !heroTitle || !heroSynopsis) {
        console.warn('loadHeroBanner: Hero DOM elements not found.');
        return;
    }

    try {
        const results = await MangaService.searchManga(titleQuery, 5, null);

        if (!results || results.length === 0) {
            // Keep existing placeholder text rather than showing a broken banner
            console.warn('loadHeroBanner: No results returned for featured title.');
            return;
        }

        const manga = results.find(m =>
            m.author && (m.author.includes('Fukuda') || m.author.includes('Shinichi'))
        ) || results[0];

        if (manga.coverImage) {
            heroBanner.style.backgroundImage = `url('${manga.coverImage}')`;
        }

        heroTitle.textContent = manga.title || 'Featured Manga';
        heroSynopsis.textContent =
            manga.description && manga.description.length > 150
                ? manga.description.substring(0, 150) + '...'
                : manga.description || '';

        if (btnRead) {
            btnRead.onclick = () => {
                window.location.href = `reader.html?mangaId=${manga.id}`;
            };
        }
        if (btnInfo) {
            btnInfo.onclick = () => ModalController.open(manga);
        }

    } catch (err) {
        // Non-fatal — hero just stays as placeholder
        console.error('loadHeroBanner: Unexpected error:', err);
    }
}

/**
 * Fetches manga by category and injects Manga Cards into a target row.
 * Shows an informative empty state if no results are returned.
 *
 * @param {HTMLElement}  containerElem - The flex container to populate.
 * @param {string|null}  query         - Optional search string.
 * @param {number}       limit         - Number of items to fetch.
 * @param {string}       genre_id      - MangaDex tag UUID.
 */
async function populateRow(containerElem, query, limit, genre_id) {
    if (!containerElem) {
        console.warn('populateRow: containerElem is null or undefined.');
        return;
    }

    try {
        const mangaList = await MangaService.searchManga(query, limit, genre_id);

        containerElem.innerHTML = '';

        if (!mangaList || mangaList.length === 0) {
            containerElem.innerHTML = `
                <p style="color:#666; padding: 20px; font-size: 0.9rem;">
                    No titles found for this category.
                </p>`;
            return;
        }

        mangaList.forEach(manga => {
            try {
                const card = UIHelper.createMangaCard(manga, (m) => ModalController.open(m));
                containerElem.appendChild(card);
            } catch (cardErr) {
                console.error('populateRow: Failed to create card for manga:', manga?.id, cardErr);
                // Skip this card and continue rendering the rest
            }
        });

    } catch (err) {
        console.error('populateRow: Failed to populate row:', err);
        containerElem.innerHTML = `
            <p style="color:#e50914; padding: 20px; font-size: 0.9rem;">
                Failed to load this row. Check that the backend server is running.
            </p>`;
    }
}

/**
 * Calculates and executes smooth horizontal scrolling for the dashboard rows.
 */
function setupScrollListeners() {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) {
        console.warn('setupScrollListeners: .dashboard element not found.');
        return;
    }

    dashboard.addEventListener('click', (e) => {
        if (!e.target.classList.contains('handle')) return;

        const button = e.target;
        const container = button.parentElement?.querySelector('.row-container');
        if (!container) {
            console.warn('setupScrollListeners: Could not find .row-container sibling of handle.');
            return;
        }

        const scrollDistance = container.clientWidth * 0.8;
        if (button.classList.contains('left-handle')) {
            container.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollDistance, behavior: 'smooth' });
        }
    });
}

/**
 * Reads localStorage progress data to generate the Continue Reading row.
 * Handles corrupt or unexpected localStorage values gracefully.
 */
function loadContinueReading() {
    let progress = {};

    try {
        const raw = localStorage.getItem('readingProgress');
        if (raw) {
            const parsed = JSON.parse(raw);
            // Guard: parsed value must be a plain object, not an array or primitive
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                progress = parsed;
            } else {
                console.warn('loadContinueReading: readingProgress is not an object, resetting.');
                localStorage.removeItem('readingProgress');
            }
        }
    } catch (err) {
        console.error('loadContinueReading: Failed to parse readingProgress from localStorage:', err);
        localStorage.removeItem('readingProgress');
        return;
    }

    const readingList = Object.values(progress).sort((a, b) => {
        // Guard: missing timestamp — treat as oldest
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    if (readingList.length === 0) return;

    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;

    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<h3 class="row-title">Continue Reading</h3>`;

    const container = document.createElement('div');
    container.className = 'row-container';

    readingList.forEach(manga => {
        // Guard: skip entries missing the required id field
        if (!manga || !manga.id) {
            console.warn('loadContinueReading: Skipping progress entry missing id:', manga);
            return;
        }

        const chapterText = manga.chapterNum ? `Ch. ${manga.chapterNum} | ` : '';
        const pageNum = typeof manga.pageIndex === 'number' ? manga.pageIndex + 1 : '?';
        const badgeText = `${chapterText}Page ${pageNum}`;

        try {
            const card = UIHelper.createMangaCard(
                manga,
                (m) => { window.location.href = `reader.html?mangaId=${m.id}`; },
                badgeText
            );
            container.appendChild(card);
        } catch (cardErr) {
            console.error('loadContinueReading: Failed to create card for:', manga.id, cardErr);
        }
    });

    // Only add the row if at least one card was created
    if (container.children.length > 0) {
        row.appendChild(container);
        dashboard.insertBefore(row, dashboard.firstChild);
    }
}