/**
 * js/navbar.js - Shared Global Navigation Component
 * 
 * Dynamically injects the Navigation Bar into any page that contains a navbar.
 * This ensures UI consistency across the app without needing to duplicate
 * HTML code in every file.
 */

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});

/**
 * Builds and injects the Navbar HTML.
 */
function renderNavbar() {
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    // Find the current page to highlight the correct link
    const path = window.location.pathname;
    const page = path.split('/').pop();

    const isHomeActive = (page === 'index.html' || page === '') ? 'active' : '';
    const isFavActive = (page === 'favorites.html') ? 'active' : '';

    navContainer.innerHTML = `
        <header class="navbar">
            <h1 class="logo" onclick="window.location.href='index.html'"><span class="logo-red">Manga</span><span class="logo-grey">List</span></h1>
            <nav>
                <ul>
                    <li><a href="index.html" class="${isHomeActive}">Home</a></li>
                    <li><a href="favorites.html" class="${isFavActive}">My Favorites</a></li>
                </ul>
            </nav>

            <div class="nav-right" style="display: flex; align-items: center; gap: 20px;">

                <div class="nav-search">
                    <input type="text" id="search-input"    placeholder="Search manga..." autocomplete="off">
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
 * Handles the Avatar click to show the user profile menu.
 */
function setupDropdown() {
    const avatar = document.querySelector('.avatar');
    const dropdown = document.querySelector('.dropdown-menu');

    if (avatar && dropdown) {
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
}

/**
 * Implements a debounced API search engine.
 * Instead of firing an API request for every single keystroke, it waits
 * until the user stops typing for 500ms.
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    let debounceTimer;

    if (!searchInput || !searchDropdown) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        // Hide dropdown if they erase everything
        if (query.length < 3) {
            searchDropdown.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            searchDropdown.innerHTML = '<div class="search-msg">Searching...</div>';
            searchDropdown.classList.remove('hidden');

            try {
                const results = await MangaService.searchManga(query, 5);

                searchDropdown.innerHTML = '';
                if (results.length === 0) {
                    searchDropdown.innerHTML = '<div class="search-msg">No results found.</div>';
                    return;
                }

                // Populate search results
                results.forEach(manga => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.innerHTML = `
                        <div class="search-result-cover" style="background-image: url('${manga.coverImage}')"></div>
                        <div class="search-result-info">
                            <h4>${manga.title}</h4>
                            <p>${manga.status ? manga.status.toUpperCase() : 'UNKNOWN'}</p>
                        </div>
                    `;

                    // Handle clicking a search result
                    item.addEventListener('click', () => {
                        if (typeof ModalController !== 'undefined') {
                            ModalController.open(manga);
                            searchDropdown.classList.add('hidden');
                            searchInput.value = '';
                        } else {
                            window.location.href = `reader.html?mangaId=${manga.id}`;
                        }
                    });
                    searchDropdown.appendChild(item);
                });
            } catch (err) {
                searchDropdown.innerHTML = '<div class="search-msg">Error loading results.</div>';
            }
        }, 500);
    });
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });
}