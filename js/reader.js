/**
 * js/reader.js - Theater Mode Controller
 * 
 * Manages the full-screen reading experience.
 */

// State variables to keep track of where the user is in the chapter
let pages = [];
let currentPageIndex = 0;
let currentManga = null;
let allChapters = [];
let currentChapterId = null;
let readerLayout = localStorage.getItem('readerLayout') || 'single';
let readerDirection = localStorage.getItem('readerDirection') || 'ltr';

document.addEventListener('DOMContentLoaded', async () => {
    // Extract Manga ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('mangaId');
    const targetChapterId = urlParams.get('chapterId');

    if (!mangaId) {
        window.location.href = 'index.html';
        return;
    }

    // Fetch Manga details to populate top HUD title
    currentManga = await MangaService.getMangaById(mangaId);
    if (currentManga) {
        document.getElementById('manga-title-display').textContent = currentManga.title;
    }

    // Fetch and load chapter pages
    await loadChapters(mangaId, targetChapterId);
    setupSettingsPanel();

    // Invisible click zones for navigating
    document.getElementById('left-zone').addEventListener('click', () => {
        if (readerDirection === 'rtl') nextPage(); else prevPage();
    });
    document.getElementById('right-zone').addEventListener('click', () => {
        if (readerDirection === 'rtl') prevPage(); else nextPage();
    });

    const slider = document.getElementById('page-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            currentPageIndex = parseInt(e.target.value);
            renderPage();
        });
    }

    // Keyboard support for code above
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            if (readerDirection === 'rtl') prevPage(); else nextPage();
        }
        if (e.key === 'ArrowLeft') {
            if (readerDirection === 'rtl') nextPage(); else prevPage();
        }
        if (e.key === 'Escape') window.location.href = 'index.html';
    });
});

function setupSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    const btnOpen = document.getElementById('settings-btn');
    const btnClose = document.getElementById('close-settings-btn');
    const layoutSelect = document.getElementById('setting-layout');
    const directionSelect = document.getElementById('setting-direction');

    layoutSelect.value = readerLayout;
    directionSelect.value = readerDirection;

    btnOpen.onclick = () => panel.classList.add('open');
    btnClose.onclick = () => panel.classList.remove('open');

    layoutSelect.addEventListener('change', (e) => {
        readerLayout = e.target.value;
        localStorage.setItem('readerLayout', readerLayout);
        renderPage();
    });

    directionSelect.addEventListener('change', (e) => {
        readerDirection = e.target.value;
        localStorage.setItem('readerDirection', readerDirection);
        renderPage();
    })
}

async function loadChapters(mangaId, targetChapterId) {
    try {
        const feedData = await MangaService.getMangaFeed(mangaId);

        if (!feedData.data || feedData.data.length === 0) {
            showNoChaptersError();
            return;
        }

        // Filter and sort all valid chapters
        allChapters = feedData.data.filter(chapter => 
            chapter?.attributes?.pages > 0 && !chapter?.attributes?.externalUrl
        );
        allChapters.sort((a, b) => parseFloat(a.attributes.chapter || 0) - parseFloat(b.attributes.chapter || 0));

        if (allChapters.length === 0) {
            showNoChaptersError();
            return;
        }

        let chapterToLoad = null;

        // Did they click a specific chapter in the modal?
        if (targetChapterId) {
            chapterToLoad = allChapters.find(c => c.id === targetChapterId);
        }

        // If not, do they have saved progress?
        if (!chapterToLoad) {
            const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
            if (progress[mangaId] && progress[mangaId].chapterId) {
                chapterToLoad = allChapters.find(c => c.id === progress[mangaId].chapterId);
            }
        }

        // If not, visit chapter 1
        if (!chapterToLoad) {
            chapterToLoad = allChapters[0];
        }

        currentChapterId = chapterToLoad.id;

        buildChapterDropdown();
        await fetchAndRenderChapter(currentChapterId, mangaId, targetChapterId !== null);
    } catch (error) {
        console.error("CRITICAL ERROR loading chapter:", error);
        showNoChaptersError();
    }
}

function buildChapterDropdown() {
    let select = document.getElementById('chapter-select');

    if (!select) {
        const titleDisplay = document.getElementById('manga-title-display');
        select = document.createElement('select');
        select.id = 'chapter-select';
        select.className = 'chapter-dropdown';
        titleDisplay.parentNode.insertBefore(select, titleDisplay.nextSibling);

        titleDisplay.style.display = 'inline-block';
        titleDisplay.parentNode.style.display = 'flex';
        titleDisplay.parentNode.style.alignItems = 'center';

        select.addEventListener('keydown', (e) => {
            e.preventDefault();
        })
    }

    // Handle user selection from dropdown
    select.addEventListener('change', async (e) => {
        currentChapterId = e.target.value;
        select.blur();
        await fetchAndRenderChapter(currentChapterId, currentManga.id, true);
    });

    select.innerHTML = '';
    allChapters.forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter.id;
        const chapNum = chapter.attributes.chapter ? `Chapter ${chapter.attributes.chapter}` : 'Oneshot';
        option.textContent = chapNum;

        // Highlight currently reading chapter
        if (chapter.id === currentChapterId) option.selected = true;
        select.appendChild(option);
    });
}

async function fetchAndRenderChapter(chapterId, mangaId, isNewChapterClick) {
    const pagesData = await MangaService.getChapterImages(chapterId);

    if (!pagesData || pagesData.length === 0) {
        showNoChaptersError();
        return;
    }

    pages = pagesData;
    document.getElementById('total-pages').textContent = pages.length;

    const slider = document.getElementById('page-slider');
    if (slider) slider.max = pages.length - 1;

    currentPageIndex = 0;

    // If they did not click a new chapter, resume their saved progress
    if (!isNewChapterClick) {
        const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
        if (progress[mangaId] && progress[mangaId].chapterId === chapterId) {
            currentPageIndex = progress[mangaId].pageIndex || 0;
            if (currentPageIndex >= pages.length) currentPageIndex = pages.length - 1;
        }
    }

    renderPage();
}

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

function renderPage() {
    if (pages.length === 0) return;

    const img1 = document.getElementById('reader-image-1');
    const img2 = document.getElementById('reader-image-2');
    const container = document.getElementById('image-container');
    const counterElem = document.getElementById('current-page');

    // Invert if Manga Mode is on
    container.style.flexDirection = (readerDirection === 'rtl') ? 'row-reverse' : 'row';

    // Render first page
    img1.src = pages[currentPageIndex];

    if (readerLayout === 'double' && currentPageIndex < pages.length - 1) {
        img2.src = pages[currentPageIndex + 1];
        img2.style.display = 'block';
        container.classList.remove('single-mode');
        counterElem.textContent = `${currentPageIndex + 1}-${currentPageIndex + 2}`;
    } else {
        img2.style.display = 'none';
        container.classList.add('single-mode');
        counterElem.textContent = currentPageIndex + 1;
    }

    // Scroll to top if prev page was tall
    window.scrollTo(0, 0);

    const slider = document.getElementById('page-slider');
    if (slider) {
        slider.value = currentPageIndex;
        slider.dir = (readerDirection === 'rtl') ? 'rtl' : 'ltr';
        slider.style.backgroundPosition = (readerDirection === 'rtl') ? 'right center' : 'left center';
        const percent = pages.length > 1 ? (currentPageIndex / (pages.length - 1)) * 100 : 0;
        slider.style.backgroundSize = `${percent}% 100%`;
    }

    if (currentManga) {
        let chapNum = '?';
        if (allChapters && allChapters.length > 0) {
            const currentChapter = allChapters.find(c => c.id == currentChapterId);
            if (currentChapter) {
                chapNum = currentChapter.attributes.chapter ? currentChapter.attributes.chapter : 'Oneshot';
            }
        }
        const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
        progress[currentManga.id] = {
            id: currentManga.id,
            title: currentManga.title,
            coverImage: currentManga.coverImage,
            chapterId: currentChapterId,
            chapterNum: chapNum,
            pageIndex: currentPageIndex,
            timestamp: Date.now()
        };
        localStorage.setItem('readingProgress', JSON.stringify(progress));
        if (typeof CloudSync !== 'undefined') CloudSync.saveToCloud();
    }
}

async function nextPage() {
    // One or 2 pages
    const step = (readerLayout === 'double' && currentPageIndex < pages.length - 1) ? 2 : 1;

    // Only go forward if we aren't on the last page
    if (currentPageIndex < pages.length - 1) {
        currentPageIndex += step;
        renderPage();
    } else {
        const currentIndex = allChapters.findIndex(c => c.id === currentChapterId);

        // Check if there's another chapter
        if (currentIndex !== -1 && currentIndex + 1 < allChapters.length) {
            const nextChapter = allChapters[currentIndex + 1];
            currentChapterId = nextChapter.id;

            // Update dropdown to match
            const select = document.getElementById('chapter-select');
            if (select) select.value = currentChapterId;

            await fetchAndRenderChapter(currentChapterId, currentManga.id, true);
        } else {
            window.location.href = `index.html?openModal=${currentManga.id}`;
        }
    }
}

function prevPage() {
    const step = (readerLayout === 'double') ? 2 : 1;

    // Only go backward if we aren't on the first page
    if (currentPageIndex > 0) {
        currentPageIndex = Math.max(0, currentPageIndex - step);
        renderPage();
    }
}