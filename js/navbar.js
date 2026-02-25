/**
 * js/navbar.js - Shared Global Navigation Component
 */

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});

function renderNavbar() {
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

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

                <div class="user-profile">
                    <div class="avatar"></div>
                    <div class="dropdown-menu hidden">
                        <a href="profile.html">Profile</a>
                        <a href="settings.html">Settings</a>
                        <div class="dropdown-divider"></div>
                        <a href="#">Log Out</a>
                    </div>
                </div>
            </div>
        </header>
    `;

    setupDropdown();
    setupSearch();
}

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

                    item.addEventListener('click', () => {
                        if (typeof openModal === 'function') {
                            openModal(manga);
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