/**
 * main.js - Home Page Contoller
 * 
 * Manages the UI components and connects the HTML layout to the MangaService API layer.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Wait for HTML to fully load before trying to manipulate it
    initDashboard();

    setupModalListener();
});

async function initDashboard() {
    // Load the Hero Banner with a featured title
    // Will probably change to be dynamic
    await loadHeroBanner("Sono Bosque Doll wa Koi");

    // Load scrollable rows
    const rowContainers = document.querySelectorAll('.row-container');

    if (rowContainers.length >= 2) {
        // rowContainers[0] = Popular Action
        await populateRow(rowContainers[0], "Action", 10);
        
        // rowContainers[1] = New Releases
        await populateRow(rowContainers[1], "Romance", 10);
    }
}

async function loadHeroBanner(titleQuery) {
    const results = await MangaService.searchManga(titleQuery, 5)

    if (results.length > 0) {
        const manga = results.find(m => m.author.includes('Fukuda') || m.author.includes('Shinichi')) || results[0];
        const banner = document.querySelector('.hero-banner');
        const titleElem = document.querySelector('.hero-title');
        const synopsisElem = document.querySelector('.hero-synopsis');
        const moreInfoBtn = document.querySelector('.btn-info');

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

function closeModal() {
    const modal = document.getElementById('manga-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
}