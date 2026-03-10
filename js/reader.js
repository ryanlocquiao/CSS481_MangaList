/**
 * js/reader.js - Theater Mode Controller
 *
 * Manages the full-screen reading experience, including dynamic
 * dual-page layouts, right-to-left (RTL) manga reading modes,
 * and state synchronization with LocalStorage/Cloud.
 */

const ReaderState = {
    pages:            [],
    currentPageIndex: 0,
    currentManga:     null,
    allChapters:      [],
    currentChapterId: null,
    layout:           'single',
    direction:        'ltr',
};

document.addEventListener('DOMContentLoaded', async () => {
    // Safely load persisted reader preferences
    try {
        ReaderState.layout    = localStorage.getItem('readerLayout')    || 'single';
        ReaderState.direction = localStorage.getItem('readerDirection') || 'ltr';
    } catch (err) {
        console.error('reader.js: Failed to read preferences from localStorage:', err);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const mangaId   = urlParams.get('mangaId');
    const targetChapterId = urlParams.get('chapterId');

    if (!mangaId) {
        console.error('reader.js: No mangaId in URL. Redirecting to home.');
        window.location.href = 'index.html';
        return;
    }

    // Show the title immediately so the user knows something is loading
    try {
        ReaderState.currentManga = await MangaService.getMangaById(mangaId);
        const titleDisplay = document.getElementById('manga-title-display');
        if (titleDisplay) {
            titleDisplay.textContent = ReaderState.currentManga?.title || 'Loading...';
        }
    } catch (err) {
        console.error('reader.js: Failed to fetch manga metadata:', err);
        // Non-fatal — continue loading chapters even without full metadata
    }

    setupSettingsPanel();
    setupNavigationControls();

    await loadChapters(mangaId, targetChapterId);
});

/**
 * Initializes the slide-out settings panel and its dropdown listeners.
 */
function setupSettingsPanel() {
    const panel           = document.getElementById('settings-panel');
    const btnOpen         = document.getElementById('settings-btn');
    const btnClose        = document.getElementById('close-settings-btn');
    const layoutSelect    = document.getElementById('setting-layout');
    const directionSelect = document.getElementById('setting-direction');

    if (!panel || !btnOpen || !btnClose || !layoutSelect || !directionSelect) {
        console.warn('setupSettingsPanel: One or more settings panel elements not found.');
        return;
    }

    layoutSelect.value    = ReaderState.layout;
    directionSelect.value = ReaderState.direction;

    btnOpen.onclick  = () => panel.classList.add('open');
    btnClose.onclick = () => panel.classList.remove('open');

    layoutSelect.addEventListener('change', (e) => {
        ReaderState.layout = e.target.value;
        try {
            localStorage.setItem('readerLayout', ReaderState.layout);
        } catch (err) {
            console.error('setupSettingsPanel: Could not save layout preference:', err);
        }
        renderPage();
    });

    directionSelect.addEventListener('change', (e) => {
        ReaderState.direction = e.target.value;
        try {
            localStorage.setItem('readerDirection', ReaderState.direction);
        } catch (err) {
            console.error('setupSettingsPanel: Could not save direction preference:', err);
        }
        renderPage();
    });
}

/**
 * Wires up click zones, slider, and keyboard listeners.
 */
function setupNavigationControls() {
    const leftZone  = document.getElementById('left-zone');
    const rightZone = document.getElementById('right-zone');
    const slider    = document.getElementById('page-slider');

    if (!leftZone || !rightZone) {
        console.warn('setupNavigationControls: Click zones not found.');
    } else {
        leftZone.addEventListener('click', () => {
            if (ReaderState.direction === 'rtl') nextPage(); else prevPage();
        });
        rightZone.addEventListener('click', () => {
            if (ReaderState.direction === 'rtl') prevPage(); else nextPage();
        });
    }

    if (slider) {
        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0 && val < ReaderState.pages.length) {
                ReaderState.currentPageIndex = val;
                renderPage();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowRight':
                if (ReaderState.direction === 'rtl') prevPage(); else nextPage();
                break;
            case 'ArrowLeft':
                if (ReaderState.direction === 'rtl') nextPage(); else prevPage();
                break;
            case 'Escape':
                if (!document.fullscreenElement) window.location.href = 'index.html';
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) document.body.classList.add('fullscreen-mode');
        else document.body.classList.remove('fullscreen-mode');
    });
}

/**
 * Fetches the chapter list and determines which chapter to load first.
 */
async function loadChapters(mangaId, targetChapterId) {
    try {
        const feedData = await MangaService.getMangaFeed(mangaId);

        if (!feedData || !Array.isArray(feedData.data) || feedData.data.length === 0) {
            showReaderError('No chapters are available for this manga.');
            return;
        }

        ReaderState.allChapters = feedData.data
            .filter(chapter => {
                if (!chapter?.attributes) return false;
                return chapter.attributes.pages > 0 && !chapter.attributes.externalUrl;
            })
            .sort((a, b) => {
                return parseFloat(a.attributes.chapter || 0) - parseFloat(b.attributes.chapter || 0);
            });

        if (ReaderState.allChapters.length === 0) {
            showReaderError('No readable English chapters found. This title may be licensed or region-locked.');
            return;
        }

        let chapterToLoad = null;

        // Priority 1: Explicit URL param
        if (targetChapterId) {
            chapterToLoad = ReaderState.allChapters.find(c => c.id === targetChapterId) || null;
            if (!chapterToLoad) {
                console.warn(`loadChapters: Chapter ID from URL not found in feed: ${targetChapterId}`);
            }
        }

        // Priority 2: Saved reading progress
        if (!chapterToLoad) {
            try {
                const raw = localStorage.getItem('readingProgress');
                const progress = raw ? JSON.parse(raw) : {};
                const savedChapterId = progress[mangaId]?.chapterId;
                if (savedChapterId) {
                    chapterToLoad = ReaderState.allChapters.find(c => c.id === savedChapterId) || null;
                }
            } catch (err) {
                console.error('loadChapters: Failed to read reading progress from localStorage:', err);
            }
        }

        // Priority 3: First chapter
        if (!chapterToLoad) {
            chapterToLoad = ReaderState.allChapters[0];
        }

        ReaderState.currentChapterId = chapterToLoad.id;

        buildChapterDropdown();
        await fetchAndRenderChapter(ReaderState.currentChapterId, mangaId, targetChapterId !== null);

    } catch (err) {
        console.error('loadChapters: Unexpected error:', err);
        showReaderError('Failed to load chapters. Check your connection and try again.');
    }
}

/**
 * Injects a chapter select dropdown into the top HUD.
 */
function buildChapterDropdown() {
    let select = document.getElementById('chapter-select');

    if (!select) {
        const titleDisplay = document.getElementById('manga-title-display');
        if (!titleDisplay) {
            console.warn('buildChapterDropdown: manga-title-display element not found.');
            return;
        }

        select = document.createElement('select');
        select.id        = 'chapter-select';
        select.className = 'chapter-dropdown';
        titleDisplay.parentNode.insertBefore(select, titleDisplay.nextSibling);

        titleDisplay.parentNode.style.display    = 'flex';
        titleDisplay.parentNode.style.alignItems = 'center';

        select.addEventListener('keydown', (e) => e.preventDefault());
    }

    // Remove old listener by cloning (safe way to avoid duplicate events)
    const newSelect = select.cloneNode(false);
    select.parentNode.replaceChild(newSelect, select);
    select = newSelect;

    select.addEventListener('change', async (e) => {
        const newChapterId = e.target.value;
        if (!newChapterId) return;
        ReaderState.currentChapterId = newChapterId;
        select.blur();
        await fetchAndRenderChapter(ReaderState.currentChapterId, ReaderState.currentManga?.id, true);
    });

    select.innerHTML = '';
    ReaderState.allChapters.forEach(chapter => {
        const option    = document.createElement('option');
        option.value    = chapter.id;
        option.textContent = chapter.attributes.chapter
            ? `Chapter ${chapter.attributes.chapter}`
            : 'Oneshot';
        if (chapter.id === ReaderState.currentChapterId) option.selected = true;
        select.appendChild(option);
    });
}

/**
 * Fetches image URLs for the active chapter and sets up the reader.
 */
async function fetchAndRenderChapter(chapterId, mangaId, isNewChapterClick) {
    if (!chapterId) {
        console.error('fetchAndRenderChapter: chapterId is required.');
        showReaderError('Could not determine which chapter to load.');
        return;
    }

    try {
        const pagesData = await MangaService.getChapterImages(chapterId);

        if (!pagesData || pagesData.length === 0) {
            showReaderError('No pages are available for this chapter. It may be licensed or region-locked.');
            return;
        }

        // Hide any previous error message
        const prevError = document.getElementById('reader-error-msg');
        if (prevError) prevError.remove();

        const container  = document.getElementById('image-container');
        const leftZone   = document.getElementById('left-zone');
        const rightZone  = document.getElementById('right-zone');

        if (container)  container.style.display  = '';
        if (leftZone)   leftZone.style.display   = '';
        if (rightZone)  rightZone.style.display  = '';

        ReaderState.pages = pagesData;

        const totalPagesEl = document.getElementById('total-pages');
        if (totalPagesEl) totalPagesEl.textContent = ReaderState.pages.length;

        const slider = document.getElementById('page-slider');
        if (slider) slider.max = ReaderState.pages.length - 1;

        ReaderState.currentPageIndex = 0;

        // Restore saved position when resuming (not when explicitly clicking a chapter)
        if (!isNewChapterClick && mangaId) {
            try {
                const raw      = localStorage.getItem('readingProgress');
                const progress = raw ? JSON.parse(raw) : {};
                const saved    = progress[mangaId];

                if (saved && saved.chapterId === chapterId && typeof saved.pageIndex === 'number') {
                    const restoredIndex = saved.pageIndex;
                    // Guard: saved index must be within current page count
                    if (restoredIndex >= 0 && restoredIndex < ReaderState.pages.length) {
                        ReaderState.currentPageIndex = restoredIndex;
                    } else {
                        console.warn(`fetchAndRenderChapter: Saved page index ${restoredIndex} is out of bounds (${ReaderState.pages.length} pages). Starting from page 1.`);
                    }
                }
            } catch (err) {
                console.error('fetchAndRenderChapter: Failed to restore reading progress:', err);
                // Non-fatal — just start from the beginning
            }
        }

        renderPage();

    } catch (err) {
        console.error('fetchAndRenderChapter: Unexpected error:', err);
        showReaderError('Failed to load chapter pages. Check your connection and try again.');
    }
}

/**
 * Displays a full-screen error message inside the Theater Mode canvas.
 *
 * @param {string} message - Error description to show the user.
 */
function showReaderError(message) {
    const container = document.getElementById('image-container');
    const leftZone  = document.getElementById('left-zone');
    const rightZone = document.getElementById('right-zone');

    if (container)  container.style.display  = 'none';
    if (leftZone)   leftZone.style.display   = 'none';
    if (rightZone)  rightZone.style.display  = 'none';

    const canvas = document.querySelector('.theater-canvas');
    if (!canvas) return;

    let errorMsg = document.getElementById('reader-error-msg');
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'reader-error-msg';
        Object.assign(errorMsg.style, {
            color:     '#a3a3a3',
            fontSize:  '1.25rem',
            textAlign: 'center',
            padding:   '40px',
            maxWidth:  '600px',
            lineHeight: '1.6',
            position:  'absolute',
            top:       '50%',
            left:      '50%',
            transform: 'translate(-50%, -50%)',
        });
        canvas.appendChild(errorMsg);
    }

    errorMsg.textContent = message;

    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl  = document.getElementById('total-pages');
    if (currentPageEl) currentPageEl.textContent = '0';
    if (totalPagesEl)  totalPagesEl.textContent  = '0';
}

/**
 * Core rendering engine — updates the DOM to show the correct page(s).
 */
function renderPage() {
    if (!ReaderState.pages || ReaderState.pages.length === 0) {
        console.warn('renderPage: Called with empty pages array.');
        return;
    }

    // Clamp index defensively — should never be needed, but prevents blank screens
    if (ReaderState.currentPageIndex < 0) {
        ReaderState.currentPageIndex = 0;
    }
    if (ReaderState.currentPageIndex >= ReaderState.pages.length) {
        ReaderState.currentPageIndex = ReaderState.pages.length - 1;
    }

    const img1         = document.getElementById('reader-image-1');
    const img2         = document.getElementById('reader-image-2');
    const container    = document.getElementById('image-container');
    const counterElem  = document.getElementById('current-page');

    if (!img1 || !img2 || !container || !counterElem) {
        console.error('renderPage: One or more required reader DOM elements are missing.');
        return;
    }

    container.style.flexDirection = (ReaderState.direction === 'rtl') ? 'row-reverse' : 'row';

    const currentSrc = ReaderState.pages[ReaderState.currentPageIndex];
    if (!currentSrc) {
        console.error(`renderPage: No URL at page index ${ReaderState.currentPageIndex}.`);
        return;
    }
    img1.src = currentSrc;

    // Attach fallback for broken images (e.g. CDN failure mid-read)
    img1.onerror = () => {
        console.warn(`renderPage: Failed to load image at index ${ReaderState.currentPageIndex}.`);
        img1.alt = 'Image failed to load. Try refreshing.';
    };

    const hasNextPage = ReaderState.currentPageIndex < ReaderState.pages.length - 1;
    if (ReaderState.layout === 'double' && hasNextPage) {
        const nextSrc = ReaderState.pages[ReaderState.currentPageIndex + 1];
        img2.src          = nextSrc || '';
        img2.style.display = 'block';
        img2.onerror = () => { img2.alt = 'Image failed to load.'; };
        container.classList.remove('single-mode');
        counterElem.textContent = `${ReaderState.currentPageIndex + 1}–${ReaderState.currentPageIndex + 2}`;
    } else {
        img2.style.display = 'none';
        container.classList.add('single-mode');
        counterElem.textContent = ReaderState.currentPageIndex + 1;
    }

    window.scrollTo(0, 0);

    const slider = document.getElementById('page-slider');
    if (slider) {
        slider.value = ReaderState.currentPageIndex;
        slider.dir   = (ReaderState.direction === 'rtl') ? 'rtl' : 'ltr';
        slider.style.backgroundPosition = (ReaderState.direction === 'rtl') ? 'right center' : 'left center';
        const percent = ReaderState.pages.length > 1
            ? (ReaderState.currentPageIndex / (ReaderState.pages.length - 1)) * 100
            : 0;
        slider.style.backgroundSize = `${percent}% 100%`;
    }

    saveReadingProgress();
}

/**
 * Saves the current reading position to localStorage and triggers cloud sync.
 * Wrapped in try/catch so a storage failure never crashes the reader.
 */
function saveReadingProgress() {
    if (!ReaderState.currentManga?.id) return;

    try {
        let chapNum = '?';
        if (Array.isArray(ReaderState.allChapters) && ReaderState.currentChapterId) {
            const currentChapter = ReaderState.allChapters.find(c => c.id === ReaderState.currentChapterId);
            if (currentChapter?.attributes) {
                chapNum = currentChapter.attributes.chapter || 'Oneshot';
            }
        }

        let progress = {};
        try {
            const raw = localStorage.getItem('readingProgress');
            if (raw) {
                const parsed = JSON.parse(raw);
                progress = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
            }
        } catch (parseErr) {
            console.error('saveReadingProgress: Could not parse existing progress, starting fresh:', parseErr);
        }

        progress[ReaderState.currentManga.id] = {
            id:          ReaderState.currentManga.id,
            title:       ReaderState.currentManga.title       || '',
            coverImage:  ReaderState.currentManga.coverImage  || '',
            chapterId:   ReaderState.currentChapterId,
            chapterNum:  chapNum,
            pageIndex:   ReaderState.currentPageIndex,
            timestamp:   Date.now(),
        };

        localStorage.setItem('readingProgress', JSON.stringify(progress));

        if (typeof CloudSync !== 'undefined') {
            CloudSync.saveToCloud().catch(err =>
                console.error('saveReadingProgress: CloudSync.saveToCloud failed:', err)
            );
        }

    } catch (err) {
        // localStorage could throw QuotaExceededError — don't crash the reader
        console.error('saveReadingProgress: Failed to save progress:', err);
    }
}

/**
 * Advances the reader forward, jumping to the next chapter if at the end.
 */
async function nextPage() {
    const step = (ReaderState.layout === 'double' && ReaderState.currentPageIndex < ReaderState.pages.length - 1) ? 2 : 1;

    if (ReaderState.currentPageIndex < ReaderState.pages.length - 1) {
        ReaderState.currentPageIndex = Math.min(
            ReaderState.currentPageIndex + step,
            ReaderState.pages.length - 1
        );
        renderPage();
        return;
    }

    // End of chapter — attempt to load the next one
    if (!Array.isArray(ReaderState.allChapters) || ReaderState.allChapters.length === 0) {
        window.location.href = ReaderState.currentManga?.id
            ? `index.html?openModal=${ReaderState.currentManga.id}`
            : 'index.html';
        return;
    }

    const currentIndex = ReaderState.allChapters.findIndex(c => c.id === ReaderState.currentChapterId);

    if (currentIndex !== -1 && currentIndex + 1 < ReaderState.allChapters.length) {
        const nextChapter = ReaderState.allChapters[currentIndex + 1];
        ReaderState.currentChapterId = nextChapter.id;

        const select = document.getElementById('chapter-select');
        if (select) select.value = ReaderState.currentChapterId;

        await fetchAndRenderChapter(ReaderState.currentChapterId, ReaderState.currentManga?.id, true);
    } else {
        // No more chapters — return to the manga modal
        const returnUrl = ReaderState.currentManga?.id
            ? `index.html?openModal=${ReaderState.currentManga.id}`
            : 'index.html';
        window.location.href = returnUrl;
    }
}

/**
 * Rewinds the reader backward.
 */
function prevPage() {
    const step = (ReaderState.layout === 'double') ? 2 : 1;

    if (ReaderState.currentPageIndex > 0) {
        ReaderState.currentPageIndex = Math.max(0, ReaderState.currentPageIndex - step);
        renderPage();
    }
}

/**
 * Toggles the browser's native fullscreen mode.
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`toggleFullscreen: Could not enter fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen?.().catch(err => {
            console.error(`toggleFullscreen: Could not exit fullscreen: ${err.message}`);
        });
    }
}