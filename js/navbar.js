/**
 * js/navbar.js - Shared Global Navigation Component
 *
 * Dynamically injects the Navigation Bar into any page that contains
 * a #navbar-container element, ensuring UI consistency across the app.
 */

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});

/**
 * Builds and injects the Navbar HTML into #navbar-container.
 */
function renderNavbar() {
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) {
        console.warn('renderNavbar: #navbar-container not found. Skipping navbar render.');
        return;
    }

    const path = window.location.pathname;
    const page = path.split('/').pop();

    const isHomeActive = (page === 'index.html' || page === '') ? 'active' : '';
    const isFavActive  = (page === 'favorites.html') ? 'active' : '';

    navContainer.innerHTML = `
        <header class="navbar">
            <h1 class="logo" onclick="window.location.href='index.html'">
                <span class="logo-red">Manga</span><span class="logo-grey">List</span>
            </h1>
            <nav>
                <ul>
                    <li><a href="index.html" class="${isHomeActive}">Home</a></li>
                    <li><a href="favorites.html" class="${isFavActive}">My Favorites</a></li>
                </ul>
            </nav>
            <div class="nav-right" style="display: flex; align-items: center; gap: 20px;">
                <div class="nav-search">
                    <input type="text" id="search-input" placeholder="Search manga..." autocomplete="off">
                    <div id="search-dropdown" class="search-dropdown hidden"></div>
                </div>
                <button id="nav-login-btn" class="btn-read" style="padding: 6px 16px; font-size: 0.95rem;">Sign In</button>
                <div id="nav-user-profile" class="user-profile hidden">
                    <div class="avatar"></div>
                    <div class="dropdown-menu hidden">
                        <a href="profile.html">Profile</a>
                        <a href="settings.html">Settings</a>
                        <div class="dropdown-divider"></div>
                        <a id="nav-logout-btn" href="#">Log Out</a>
                    </div>
                </div>
            </div>
        </header>
    `;

    setupDropdown();
    setupSearch();
}

/**
 * Handles the Avatar click to show/hide the user profile dropdown.
 */
function setupDropdown() {
    const avatar   = document.querySelector('.avatar');
    const dropdown = document.querySelector('.dropdown-menu');

    if (!avatar || !dropdown) {
        console.warn('setupDropdown: Avatar or dropdown menu element not found.');
        return;
    }

    avatar.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Implements a debounced search that fires API calls 500ms after the
 * user stops typing. Cleans up properly between keystrokes.
 */
function setupSearch() {
    const searchInput    = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');

    if (!searchInput || !searchDropdown) {
        console.warn('setupSearch: Search input or dropdown element not found.');
        return;
    }

    let debounceTimer = null;

    /**
     * Displays a message inside the search dropdown.
     * @param {string} message
     * @param {string} color - CSS color (default gray).
     */
    function showDropdownMessage(message, color = '#a3a3a3') {
        searchDropdown.innerHTML = `<div class="search-msg" style="color:${color};">${message}</div>`;
        searchDropdown.classList.remove('hidden');
    }

    searchInput.addEventListener('input', (e) => {
        // Cancel any pending debounced search before starting a new one
        clearTimeout(debounceTimer);

        const query = e.target.value.trim();

        if (query.length < 3) {
            searchDropdown.classList.add('hidden');
            searchDropdown.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            // Guard: MangaService must be available
            if (typeof MangaService === 'undefined') {
                showDropdownMessage('Search service is unavailable.', '#e50914');
                return;
            }

            showDropdownMessage('Searching...');

            try {
                const results = await MangaService.searchManga(query, 5, null);

                // Guard: user may have cleared the field while the request was in-flight
                if (!searchInput.value.trim()) {
                    searchDropdown.classList.add('hidden');
                    return;
                }

                searchDropdown.innerHTML = '';

                if (!results || results.length === 0) {
                    showDropdownMessage('No results found.');
                    return;
                }

                results.forEach(manga => {
                    // Guard: skip results without a valid id
                    if (!manga || !manga.id) {
                        console.warn('setupSearch: Skipping search result with missing id:', manga);
                        return;
                    }

                    try {
                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.innerHTML = `
                            <div class="search-result-cover"
                                 style="background-image: url('${manga.coverImage || ''}')">
                            </div>
                            <div class="search-result-info">
                                <h4>${manga.title || 'Unknown Title'}</h4>
                                <p>${manga.status ? manga.status.toUpperCase() : 'UNKNOWN'}</p>
                            </div>
                        `;

                        item.addEventListener('click', () => {
                            if (typeof ModalController !== 'undefined') {
                                ModalController.open(manga);
                            } else {
                                // Fallback: navigate directly to the reader if modal is unavailable
                                window.location.href = `reader.html?mangaId=${manga.id}`;
                            }
                            searchDropdown.classList.add('hidden');
                            searchInput.value = '';
                        });

                        searchDropdown.appendChild(item);
                    } catch (itemErr) {
                        console.error('setupSearch: Failed to render search result item:', manga, itemErr);
                    }
                });

                searchDropdown.classList.remove('hidden');

            } catch (err) {
                console.error('setupSearch: Search request failed:', err);

                const isTimeout = err.name === 'AbortError';
                showDropdownMessage(
                    isTimeout
                        ? 'Search timed out. Check that the backend server is running.'
                        : 'Error loading results. Please try again.',
                    '#e50914'
                );
            }
        }, 500);
    });

    // Hide the dropdown when clicking anywhere outside the search area
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });

    // Hide the dropdown and cancel pending search on Escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearTimeout(debounceTimer);
            searchDropdown.classList.add('hidden');
            searchInput.blur();
        }
    });
}