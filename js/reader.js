/**
 * reader.js - Theater Mode Controller
 * 
 * Manages the full-screen reading experience.
 */

// State variables to keep track of where the user is in the chapter
let pages = [];
let currentPageIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // Extract Manga ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('mangaId');

    if (!mangaId) {
        window.location.href = 'index.html';
        return;
    }

    // Fetch Manga details to populate top HUD title
    const manga = await MangaService.getMangaById(mangaId);
    if (manga) {
        document.getElementById('manga-title-display').textContent = manga.title;
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
        const targetUrl = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=50`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const feedRes = await fetch(proxyUrl);

        if (!feedRes.ok) {
            throw new Error(`MangaDex API error! Status: ${feedRes.status}`);
        }

        const feedData = await feedRes.json();

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

        // Get page image URLs for that chapter
        const targetServerUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
        const proxyServerUrl = `https://corsproxy.io/?${encodeURIComponent(targetServerUrl)}`;

        const serverRes = await fetch(proxyServerUrl);

        if (!serverRes.ok) {
            throw new Error(`MangaDex API error! Status: ${serverRes.status}`);
        }

        const serverData = await serverRes.json();

        if (serverData.result === "error") {
            console.error("MangaDex Server Error:", serverData.errors);
            alert("MangaDex is having trouble loading this chapter right now.");
            return;
        }

        const baseUrl = serverData.baseUrl;
        const hash = serverData.chapter.hash;
        const filenames = serverData.chapter.data;

        pages = filenames.map(file => `${baseUrl}/data/${hash}/${file}`);

        document.getElementById('total-pages').textContent = pages.length;

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