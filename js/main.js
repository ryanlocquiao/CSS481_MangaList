/**
 * js/main.js - Home Page Contoller
 * 
 * Manages the UI components and connects the HTML layout to the MangaService API layer.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for HTML to fully load before trying to manipulate it
    initDashboard();
    setupScrollListeners();

    // User redirect after finishing manga
    const urlParams = new URLSearchParams(window.location.search);
    const openModalId = urlParams.get('openModal');

    if (openModalId) {
        const manga = await MangaService.getMangaById(openModalId);
        if (manga) openModal(manga);
        window.history.replaceState(null, '', window.location.pathname);
    }
});

async function initDashboard() {
    // Load the Hero Banner with a featured title
    // Will probably change to be dynamic
    await loadHeroBanner("Sono Bisque Doll wa Koi");

    // Load scrollable rows
    const rowContainers = document.querySelectorAll('.row-container');

    if (rowContainers.length >= 2) {
        // rowContainers[0] = Popular Action
        await populateRow(rowContainers[0], null, 30, "391b0423-d847-456f-aff0-8b0cfc03066b");
        
        // rowContainers[1] = Romance
        await populateRow(rowContainers[1], null, 30, "423e2eae-a7a2-4a8b-ac03-a8351462d71d");

        // rowContainers[2] = Fantasy
        await populateRow(rowContainers[2], null, 30, "cdc58593-87dd-415e-bbc0-2ec27bf404cc");
    }

    loadContinueReading();
}

async function loadHeroBanner(titleQuery) {
    const results = await MangaService.searchManga(titleQuery, 5, null)

    if (results.length > 0) {
        const manga = results.find(m => m.author.includes('Fukuda') || m.author.includes('Shinichi')) || results[0];
        
        document.querySelector('.hero-banner').style.backgroundImage = `url('${manga.coverImage}')`;
        document.querySelector('.hero-title').textContent = manga.title;
        document.querySelector('.hero-synopsis').textContent = manga.description.length > 150 
            ? manga.description.substring(0, 150) + '...' 
            : manga.description;

        document.querySelector('.hero-content .btn-read').onclick = () => window.location.href = `reader.html?mangaId=${manga.id}`;
        document.querySelector('.btn-info').onclick = () => ModalController.open(manga);
    }
}

async function populateRow(containerElem, query, limit, genre_id) {
    const mangaList = await MangaService.searchManga(query, limit, genre_id);
    containerElem.innerHTML = '';
    mangaList.forEach(manga => {
        const card = UIHelper.createMangaCard(manga, (m) => ModalController.open(m));
        containerElem.appendChild(card);
    });
}

function setupScrollListeners() {
    const dashboard = document.querySelector('.dashboard');

    dashboard.addEventListener('click', (e) => {
        if (e.target.classList.contains('handle')) {
            const button = e.target;
            const container = button.parentElement.querySelector('.row-container');
            const scrollDistance = container.clientWidth * 0.8;
            if (button.classList.contains('left-handle')) {
                container.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: scrollDistance, behavior: 'smooth' });
            }
        }
    });
}

function loadContinueReading() {
    const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
    const readingList = Object.values(progress).sort((a, b) => b.timestamp - a.timestamp);

    // Don't show the row if they haven't read anything
    if (readingList.length === 0) return;

    const dashboard = document.querySelector('.dashboard');
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<h3 class="row-title">Continue Reading</h3>`;
    
    const container = document.createElement('div');
    container.className = 'row-container';

    readingList.forEach(manga => {
        const chapterText = manga.chapterNum ? `Ch. ${manga.chapterNum} | ` : '';
        const badgeText = `${chapterText}Page ${manga.pageIndex + 1}`;

        const onClick = (m) => window.location.href = `reader.html?mangaId=${m.id}`;
        
        const card = UIHelper.createMangaCard(manga, onClick, badgeText);
        container.appendChild(card);
    });

    row.appendChild(container);
    dashboard.insertBefore(row, dashboard.firstChild);
}