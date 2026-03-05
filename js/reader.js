/**
 * js/reader.js - Theater Mode Controller
 * 
 * Manages the full-screen reading experience, including dynamic
 * dual-page layouts, right-to-left (RTL) manga reading modes,
 * and state synchronization with LocalStorage/Cloud.
 */

/**
 * Reader State Management
 * Grouping all reader variables into a single state object
 * prevents global namespace pollution and makes it explicitly
 * clear what data drives the current view.
 */
const ReaderState = {
    pages: [],
    currentPageIndex: 0,
    currentManga: null,
    allChapters: [],
    currentChapterId: null,
    layout: localStorage.getItem('readerLayout') || 'single',
    direction: localStorage.getItem('readerDirection') || 'ltr'
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('mangaId');
    const targetChapterId = urlParams.get('chapterId');

    // Redirect to home if accessed directly without a manga ID
    if (!mangaId) {
        window.location.href = 'index.html';
        return;
    }

    // Fetch and display the Manga Title immediately so the user knows it is loading
    ReaderState.currentManga = await MangaService.getMangaById(mangaId);
    if (ReaderState.currentManga) {
        document.getElementById('manga-title-display').textContent = ReaderState.currentManga.title;
    }

    // Initialize the core reader components
    await loadChapters(mangaId, targetChapterId);
    setupSettingsPanel();
    setupNavigationControls();
});

/**
 * Initializes the slide-out settings panel and its dropdown
 * listeners.
 */
function setupSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    const btnOpen = document.getElementById('settings-btn');
    const btnClose = document.getElementById('close-settings-btn');
    const layoutSelect = document.getElementById('setting-layout');
    const directionSelect = document.getElementById('setting-direction');

    // Sync dropdowns to match saved preferences
    layoutSelect.value = ReaderState.layout;
    directionSelect.value = ReaderState.direction;

    btnOpen.onclick = () => panel.classList.add('open');
    btnClose.onclick = () => panel.classList.remove('open');

    // Listen for layout changes (Single vs Double page)
    layoutSelect.addEventListener('change', (e) => {
        ReaderState.layout = e.target.value;
        localStorage.setItem('readerLayout', ReaderState.layout);
        renderPage(); 
    });

    // Listen for direction changes (LTR vs RTL)
    directionSelect.addEventListener('change', (e) => {
        ReaderState.direction = e.target.value;
        localStorage.setItem('readerDirection', ReaderState.direction);
        renderPage(); 
    });
}

/**
 * Wires up the interactive navigation zones, scrub slider, and
 * keyboard listeners.
 * The logic flips dynamically based on the user's RTL or LTR
 * preference.
 */
function setupNavigationControls() {
    // Invisible click zones for turning pages
    document.getElementById('left-zone').addEventListener('click', () => {
        if (ReaderState.direction === 'rtl') nextPage(); else prevPage();
    });
    
    document.getElementById('right-zone').addEventListener('click', () => {
        if (ReaderState.direction === 'rtl') prevPage(); else nextPage();
    });

    // The scrubbing progress slider
    const slider = document.getElementById('page-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            ReaderState.currentPageIndex = parseInt(e.target.value);
            renderPage();
        });
    }

    // Keyboard arrow key and fullscreen support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            if (ReaderState.direction === 'rtl') prevPage(); else nextPage();
        }
        if (e.key === 'ArrowLeft') {
            if (ReaderState.direction === 'rtl') nextPage(); else prevPage();
        }
        if (e.key === 'Escape') {
            // Only redirect to home if they aren't in fullscreen
            if (!document.fullscreenElement) window.location.href = 'index.html';
        }
        if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) document.body.classList.add('fullscreen-mode');
        else document.body.classList.remove('fullscreen-mode');
    });
}

/**
 * Fetches the chapter list for the current manga and determines
 * which chapter to load first based on the URL parameter or
 * saved progress.
 */
async function loadChapters(mangaId, targetChapterId) {
    try {
        const feedData = await MangaService.getMangaFeed(mangaId);

        if (!feedData.data || feedData.data.length === 0) {
            showNoChaptersError();
            return;
        }

        // Filter out external/unreadable chapters and sort them in ascending order
        ReaderState.allChapters = feedData.data.filter(chapter => 
            chapter?.attributes?.pages > 0 && !chapter?.attributes?.externalUrl
        );
        ReaderState.allChapters.sort((a, b) => parseFloat(a.attributes.chapter || 0) - parseFloat(b.attributes.chapter || 0));

        if (ReaderState.allChapters.length === 0) {
            showNoChaptersError();
            return;
        }

        let chapterToLoad = null;

        // 1. Did the user explicitly click a specific chapter?
        if (targetChapterId) {
            chapterToLoad = ReaderState.allChapters.find(c => c.id === targetChapterId);
        }

        // 2. If not, do they have saved reading progress we can resume?
        if (!chapterToLoad) {
            const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
            if (progress[mangaId] && progress[mangaId].chapterId) {
                chapterToLoad = ReaderState.allChapters.find(c => c.id === progress[mangaId].chapterId);
            }
        }

        // 3. If neither, start from the very first available chapter
        if (!chapterToLoad) {
            chapterToLoad = ReaderState.allChapters[0];
        }

        ReaderState.currentChapterId = chapterToLoad.id;

        buildChapterDropdown();
        await fetchAndRenderChapter(ReaderState.currentChapterId, mangaId, targetChapterId !== null);
    } catch (error) {
        console.error("CRITICAL ERROR loading chapters:", error);
        showNoChaptersError();
    }
}

/**
 * Injects a select dropdown into the top HUD allowing users to
 * quickly jump between chapters.
 */
function buildChapterDropdown() {
    let select = document.getElementById('chapter-select');

    // Create the dropdown if it doesn't exist yet
    if (!select) {
        const titleDisplay = document.getElementById('manga-title-display');
        select = document.createElement('select');
        select.id = 'chapter-select';
        select.className = 'chapter-dropdown';
        titleDisplay.parentNode.insertBefore(select, titleDisplay.nextSibling);

        titleDisplay.style.display = 'inline-block';
        titleDisplay.parentNode.style.display = 'flex';
        titleDisplay.parentNode.style.alignItems = 'center';

        // Prevent spacebar/arrows from scrolling the dropdown when focused
        select.addEventListener('keydown', (e) => e.preventDefault());
    }

    // Handle the user selecting a new chapter
    select.addEventListener('change', async (e) => {
        ReaderState.currentChapterId = e.target.value;
        select.blur(); // Remove focus so keyboard navigation returns to turning pages
        await fetchAndRenderChapter(ReaderState.currentChapterId, ReaderState.currentManga.id, true);
    });

    // Populate the options
    select.innerHTML = '';
    ReaderState.allChapters.forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter.id;
        const chapNum = chapter.attributes.chapter ? `Chapter ${chapter.attributes.chapter}` : 'Oneshot';
        option.textContent = chapNum;

        // Highlight the chapter we are currently reading
        if (chapter.id === ReaderState.currentChapterId) option.selected = true;
        select.appendChild(option);
    });
}

/**
 * Fetches the image URLs for the active chapter and determines
 * the starting page index.
 */
async function fetchAndRenderChapter(chapterId, mangaId, isNewChapterClick) {
    const pagesData = await MangaService.getChapterImages(chapterId);

    if (!pagesData || pagesData.length === 0) {
        showNoChaptersError();
        return;
    }

    ReaderState.pages = pagesData;
    document.getElementById('total-pages').textContent = ReaderState.pages.length;

    // Setup the bounds for the scrubbing slider
    const slider = document.getElementById('page-slider');
    if (slider) slider.max = ReaderState.pages.length - 1;

    ReaderState.currentPageIndex = 0;

    // If the user is resuming, restore their exact page index
    if (!isNewChapterClick) {
        const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
        if (progress[mangaId] && progress[mangaId].chapterId === chapterId) {
            ReaderState.currentPageIndex = progress[mangaId].pageIndex || 0;
            
            // Edge case: if the API removed a page, ensure we don't overshoot the array bounds
            if (ReaderState.currentPageIndex >= ReaderState.pages.length) {
                ReaderState.currentPageIndex = ReaderState.pages.length - 1;
            }
        }
    }

    renderPage();
}

/**
 * Displays a graceful error message if the chapter fails to load
 * or is region-locked.
 */
function showNoChaptersError() {
    const container = document.getElementById('image-container');
    const leftZone = document.getElementById('left-zone');
    const rightZone = document.getElementById('right-zone');
    
    if (container) container.style.display = 'none';
    if (leftZone) leftZone.style.display = 'none';
    if (rightZone) rightZone.style.display = 'none';

    const canvas = document.querySelector('.theater-canvas');
    let errorMsg = document.getElementById('reader-error-msg');
    
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'reader-error-msg';
        errorMsg.style.color = '#a3a3a3';
        errorMsg.style.fontSize = '1.25rem';
        errorMsg.style.textAlign = 'center';
        errorMsg.style.padding = '40px';
        errorMsg.style.maxWidth = '600px';
        errorMsg.style.lineHeight = '1.6';
        errorMsg.style.position = 'absolute';
        errorMsg.style.top = '50%';
        errorMsg.style.left = '50%';
        errorMsg.style.transform = 'translate(-50%, -50%)';
        canvas.appendChild(errorMsg);
    }

    errorMsg.textContent = "Sorry, there are no English Chapters available or this Manga is licensed.";

    document.getElementById('current-page').textContent = '0';
    document.getElementById('total-pages').textContent = '0';
}

/**
 * The core rendering engine. Updates the DOM to display the
 * correct images, syncs the UI elements, and calls the save
 * function.
 */
function renderPage() {
    if (ReaderState.pages.length === 0) return;

    const img1 = document.getElementById('reader-image-1');
    const img2 = document.getElementById('reader-image-2');
    const container = document.getElementById('image-container');
    const counterElem = document.getElementById('current-page');

    // Flexbox visually inverts the images if the user is reading RTL
    container.style.flexDirection = (ReaderState.direction === 'rtl') ? 'row-reverse' : 'row';

    // Load the primary page
    img1.src = ReaderState.pages[ReaderState.currentPageIndex];

    // Layout handling (Single vs Double Page Spread)
    if (ReaderState.layout === 'double' && ReaderState.currentPageIndex < ReaderState.pages.length - 1) {
        img2.src = ReaderState.pages[ReaderState.currentPageIndex + 1];
        img2.style.display = 'block';
        container.classList.remove('single-mode');
        counterElem.textContent = `${ReaderState.currentPageIndex + 1}-${ReaderState.currentPageIndex + 2}`;
    } else {
        img2.style.display = 'none';
        container.classList.add('single-mode');
        counterElem.textContent = ReaderState.currentPageIndex + 1;
    }

    // Reset scroll position in case the previous page was a tall webtoon strip
    window.scrollTo(0, 0);

    // Sync the scrubbing slider UI
    const slider = document.getElementById('page-slider');
    if (slider) {
        slider.value = ReaderState.currentPageIndex;
        slider.dir = (ReaderState.direction === 'rtl') ? 'rtl' : 'ltr';
        slider.style.backgroundPosition = (ReaderState.direction === 'rtl') ? 'right center' : 'left center';
        
        const percent = ReaderState.pages.length > 1 ? (ReaderState.currentPageIndex / (ReaderState.pages.length - 1)) * 100 : 0;
        slider.style.backgroundSize = `${percent}% 100%`;
    }

    saveReadingProgress();
}

/**
 * Saves the current page index and chapter to LocalStorage and
 * triggers a Firebase sync.
 */
function saveReadingProgress() {
    if (!ReaderState.currentManga) return;

    let chapNum = '?';
    if (ReaderState.allChapters && ReaderState.allChapters.length > 0) {
        const currentChapter = ReaderState.allChapters.find(c => c.id == ReaderState.currentChapterId);
        if (currentChapter) {
            chapNum = currentChapter.attributes.chapter ? currentChapter.attributes.chapter : 'Oneshot';
        }
    }

    const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
    progress[ReaderState.currentManga.id] = {
        id: ReaderState.currentManga.id,
        title: ReaderState.currentManga.title,
        coverImage: ReaderState.currentManga.coverImage,
        chapterId: ReaderState.currentChapterId,
        chapterNum: chapNum,
        pageIndex: ReaderState.currentPageIndex,
        timestamp: Date.now()
    };

    localStorage.setItem('readingProgress', JSON.stringify(progress));
    if (typeof CloudSync !== 'undefined') CloudSync.saveToCloud();
}

/**
 * Advances the reader forward. Logic adapts based on whether 1
 * or 2 pages are displayed.
 * Automatically jumps to the next chapter if the current one is
 * finished.
 */
async function nextPage() {
    // Determine the step size based on current layout
    const step = (ReaderState.layout === 'double' && ReaderState.currentPageIndex < ReaderState.pages.length - 1) ? 2 : 1;

    if (ReaderState.currentPageIndex < ReaderState.pages.length - 1) {
        ReaderState.currentPageIndex += step;
        
        // Safety check in case the double-page jump overshoots the array length
        if (ReaderState.currentPageIndex >= ReaderState.pages.length) {
            ReaderState.currentPageIndex = ReaderState.pages.length - 1;
        }
        
        renderPage();
    } else {
        // End of chapter reached: attempt to load the next one
        const currentIndex = ReaderState.allChapters.findIndex(c => c.id === ReaderState.currentChapterId);

        if (currentIndex !== -1 && currentIndex + 1 < ReaderState.allChapters.length) {
            const nextChapter = ReaderState.allChapters[currentIndex + 1];
            ReaderState.currentChapterId = nextChapter.id;

            // Sync the UI dropdown
            const select = document.getElementById('chapter-select');
            if (select) select.value = ReaderState.currentChapterId;

            await fetchAndRenderChapter(ReaderState.currentChapterId, ReaderState.currentManga.id, true);
        } else {
            // If there are no more chapters, kick the user back to the home page modal
            window.location.href = `index.html?openModal=${ReaderState.currentManga.id}`;
        }
    }
}

/**
 * Rewinds the reader backward. Logic adapts based on layout.
 */
function prevPage() {
    const step = (ReaderState.layout === 'double') ? 2 : 1;

    if (ReaderState.currentPageIndex > 0) {
        // Math.max prevents the step from pushing the index into negative numbers
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
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}