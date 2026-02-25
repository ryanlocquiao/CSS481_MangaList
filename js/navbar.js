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
            <div class="user-profile">
                <div class="avatar"></div>
                <div class="dropdown-menu hidden">
                    <a href="profile.html">Profile</a>
                    <a href="settings.html">Settings</a>
                    <div class="dropdown-divider"></div>
                    <a href="#">Log Out</a>
                </div>
            </div>
        </header>
    `;

    setupDropdown();
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