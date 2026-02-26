/**
 * js/main.js - Home Page Contoller
 * 
 * Manages the UI components and connects the HTML layout to the MangaService API layer.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Wait for HTML to fully load before trying to manipulate it
    initDashboard();
    setupScrollListeners();
    setupModalListener();
});

async function initDashboard() {
    // Load the Hero Banner with a featured title
    // Will probably change to be dynamic
    await loadHeroBanner("Sono Bisque Doll wa Koi");

    // Load scrollable rows
    const rowContainers = document.querySelectorAll('.row-container');

    if (rowContainers.length >= 2) {
        // rowContainers[0] = Popular Action
        await populateRow(rowContainers[0], "Action", 10);
        
        // rowContainers[1] = New Releases
        await populateRow(rowContainers[1], "Romance", 10);
    }

    loadContinueReading();
}

async function loadHeroBanner(titleQuery) {
    const results = await MangaService.searchManga(titleQuery, 5)

    if (results.length > 0) {
        const manga = results.find(m => m.author.includes('Fukuda') || m.author.includes('Shinichi')) || results[0];
        const banner = document.querySelector('.hero-banner');
        const titleElem = document.querySelector('.hero-title');
        const synopsisElem = document.querySelector('.hero-synopsis');
        const moreInfoBtn = document.querySelector('.btn-info');

        // Switch to Theater Mode Reader
        const readBtn = document.querySelector('.hero-content .btn-read');
        readBtn.onclick = () => {
            window.location.href = `reader.html?mangaId=${manga.id}`;
        }

        banner.style.backgroundImage = `url('${manga.coverImage}')`;
        titleElem.textContent = manga.title;

        // Truncate long descriptions
        const shortDesc = manga.description.length > 150
            ? manga.description.substring(0, 150) + '...'
            : manga.description;
        synopsisElem.textContent = shortDesc;

        moreInfoBtn.onclick = () => openModal(manga);
    } else {
        console.error("No manga found for the hero banner.");
    }
}

async function populateRow(containerElem, query, limit) {
    // Fetch data from API service
    const mangaList = await MangaService.searchManga(query, limit);

    // Clear out gray HTML placeholder cards
    containerElem.innerHTML = '';

    // Generate new dynamic cards
    mangaList.forEach(manga => {
        // Creating wrapper container
        const itemContainer = document.createElement('div');
        itemContainer.className = 'manga-item';

        // Creating card cover image
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.style.backgroundImage = `url('${manga.coverImage}')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.title = manga.title;

        // This adds the title text below the card
        const titleElem = document.createElement('div');
        titleElem.className = 'manga-title-below';
        titleElem.textContent = manga.title;
        titleElem.title = manga.title;

        // Listens to both image and text to open the modal
        card.addEventListener('click', () => openModal(manga));
        titleElem.addEventListener('click', () => openModal(manga));

        itemContainer.appendChild(card);
        itemContainer.appendChild(titleElem);
        containerElem.appendChild(itemContainer);
    });
}

/**
 * Modal (More Info Popup) Logic
 */

function setupModalListener() {
    const closeBtn = document.querySelector('.close-btn');
    const overlay = document.querySelector('.modal-overlay');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

function openModal(manga) {
    const modal = document.getElementById('manga-modal');
    const coverImage = modal.querySelector('.modal-cover-image');
    const title = modal.querySelector('.modal-title');
    const rating = modal.querySelector('.modal-rating');
    const status = modal.querySelector('.modal-status');
    const synopsis = modal.querySelector('.modal-synopsis');
    const tagsContainer = modal.querySelector('.modal-tags');

    // Switch to Theater Mode Reader
    const readBtn = modal.querySelector('.btn-read');
    readBtn.onclick = () => {
        window.location.href = `reader.html?mangaId=${manga.id}`;
    }

    // Favorites Logic
    const favBtn = modal.querySelector('.btn-favorite');
    const bookmarkIcon = modal.querySelector('#bookmark-icon');

    // Pull from browser's memory
    let favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];

    let isFav = favorites.some(fav => fav.id === manga.id);
    if (isFav) {
        bookmarkIcon.src = 'assets/bookmark-filled.png';
    } else {
        bookmarkIcon.src = 'assets/bookmark-empty.png';
    }

    favBtn.onclick = () => {
        // Fetch latest list
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
    }

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

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
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

function closeModal() {
    const modal = document.getElementById('manga-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
}

function loadContinueReading() {
    const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};
    const readingList = Object.values(progress).sort((a, b) => b.timestamp - a.timestamp);

    // Don't show the row if they haven't read anything
    if (readingList.length === 0) return;

    const dashboard = document.querySelector('.dashboard');

    const row = document.createElement('div');
    row.className = 'row';

    const title = document.createElement('h3');
    title.className = 'row-title';
    title.textContent = 'Continue Reading';

    const container = document.createElement('div');
    container.className = 'row-container';

    readingList.forEach(manga => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'manga-item';

        const card = document.createElement('div');
        card.className = 'manga-card';
        card.style.backgroundImage = `url('${manga.coverImage}')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.style.position = 'relative';
        card.title = manga.title;

        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.bottom = '8px';
        badge.style.right = '8px';
        badge.style.backgroundColor = 'rgba(229, 9, 20, 0.9)';
        badge.style.color = 'white';
        badge.style.padding = '4px 8px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '0.75rem';
        badge.style.fontWeight = 'bold';
        badge.textContent = `Page ${manga.pageIndex + 1}`;
        card.appendChild(badge);

        const titleElem = document.createElement('div');
        titleElem.className = 'manga-title-below';
        titleElem.textContent = manga.title;

        card.addEventListener('click', () => window.location.href = `reader.html?mangaId=${manga.id}`);
        titleElem.addEventListener('click', () => window.location.href = `reader.html?mangaId=${manga.id}`);

        itemContainer.appendChild(card);
        itemContainer.appendChild(titleElem);
        container.appendChild(itemContainer);
    });

    row.appendChild(title);
    row.appendChild(container);

    dashboard.insertBefore(row, dashboard.firstChild);
}
