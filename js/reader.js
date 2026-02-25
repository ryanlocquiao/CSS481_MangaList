/**
 * js/reader.js - Theater Mode Controller
 * 
 * Manages the full-screen reading experience.
 */

// State variables to keep track of where the user is in the chapter
let pages = [];
let currentPageIndex = 0;
let currentManga = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Extract Manga ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('mangaId');

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
    await loadFirstChapter(mangaId);

    // Invisible click zones for navigating
    document.getElementById('next-page-btn').addEventListener('click', nextPage);
    document.getElementById('prev-page-btn').addEventListener('click', prevPage);

    // Keyboard support for code above
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextPage();
        if (e.key === 'ArrowLeft') prevPage();
        if (e.key === 'Escape') window.location.href = 'index.html';
    });
});

async function loadFirstChapter(mangaId) {
    try {
        const feedData = await MangaService.getMangaFeed(mangaId);

        if (!feedData.data || feedData.data.length === 0) {
            alert("Sorry, no English chapters are available for this manga yet.");
            window.location.href = 'index.html';
            return;
        }

        // Find the first chapter that has actual pages on MangaDex
        const validChapter = feedData.data.find(chapter =>
            chapter?.attributes?.pages > 0 && !chapter?.attributes?.externalUrl
        );

        if (!validChapter) {
            alert("Sorry, the chapters for this manga are officially licensed/externally hosted and cannot be read here.");
            window.location.href = 'index.html';
            return;
        }

        const chapterId = validChapter.id;

        const pagesData = await MangaService.getChapterImages(chapterId);

        if (!pagesData || pagesData.length === 0) {
            alert("MangaDex is having trouble loading this chapter right now.");
            return;
        }

        pages = pagesData;
        document.getElementById('total-pages').textContent = pages.length;

        const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
        if (progress[mangaId]) {
            currentPageIndex = progress[mangaId].pageIndex || 0;
            if (currentPageIndex >= pages.length) {
                currentPageIndex = pages.length - 1;
            }
        }

        renderPage();
    } catch (error) {
        console.error("CRITICAL ERROR loading chapter:", error);
        alert("There was an error loading the manga pages.");
    }
}

function renderPage() {
    if (pages.length === 0) return;

    const imgElem = document.getElementById('reader-image');
    const counterElem = document.getElementById('current-page');

    // Update image source to the current URL in our array
    imgElem.src = pages[currentPageIndex];

    // Update page counter in the HUD (zero-based)
    counterElem.textContent = currentPageIndex + 1;

    // Scroll to top if prev page was tall
    window.scrollTo(0, 0);

    if (currentManga) {
        const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
        progress[currentManga.id] = {
            id: currentManga.id,
            title: currentManga.title,
            coverImage: currentManga.coverImage,
            pageIndex: currentPageIndex,
            timestamp: Date.now()
        };
        localStorage.setItem('readingProgress', JSON.stringify(progress));
    }
}

function nextPage() {
    // Only go forward if we aren't on the last page
    if (currentPageIndex < pages.length - 1) {
        currentPageIndex++;
        renderPage();
    } else {
        alert("You've reached the end of this chapter!");
    }
}

function prevPage() {
    // Only go backward if we aren't on the first page
    if (currentPageIndex > 0) {
        currentPageIndex--;
        renderPage();
    }
}